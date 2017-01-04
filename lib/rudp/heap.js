var MinHeap = require('min-heap');


module.exports = class Heap {
  /**
  A min-heap for packets implementing total ordering.

  The packet with the minimum sequence number is always at the
  front of the sequence, i.e at index 0.
  **/

  constructor() {
    /** Create new (empty) Heap.**/
    this._heap = new MinHeap((l, r) => {
      return l.sequenceNumber - r.sequenceNumber;
    });
    this._seqnumSet = []
  }

  contains(sequenceNumber) {
    /**
    Check whether the Heap contains a packet with given seqnum.

      Args:
    sequence_number: The sequence_number, as an integer.
    **/
    return this._seqnumSet.includes(sequenceNumber);
  }
  
  size() {
    return this._heap.size;
  }

  push(rudpPacket) {
    if(this._seqnumSet.includes(rudpPacket.sequenceNumber)) {
      this._heap.insert(rudpPacket);
      this._seqnumSet.push(rudpPacket.sequenceNumber);
    }
  }

  _popMin() {
    let rudpPacket = this._heap.removeHead();
    delete this._seqnumSet[rudpPacket.sequenceNumber];
    return rudpPacket;
  }

  popMinAndAllFragments() {
    if(this._heap.size == 0) {
      return;
    }

    let minPacket = this._heap.removeHead();
    let fragmentsSeqnumSet = [];
    for(var i=0, len=minPacket.moreFragments+1; i<len; i++) {
      fragmentsSeqnumSet.push(minPacket.sequenceNumber+i);
    }

    if(fragmentsSeqnumSet.every((value) => {
        return (this._seqnumSet.indexOf(value) >= 0);
      })) {
      return;
    }

    let fragmentList = [];
    for(var j=0, len=minPacket.moreFragments+1; j<len; j++) {
      fragmentList.push(this._popMin());
    }
    return fragmentList;
  }

}

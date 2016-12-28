"use strict"

const spawn = require('threads').spawn;

module.exports = class BTCPrice {
    /**
    A class for loading and caching the current Bitcoin exchange price.
    There only needs to be one instance of the class running, use BtcPrice.instance() to access it
    **/

    constructor() {

        this.prices = {};
        this.btcPriceThread = spawn((run, done, progress) => {
            // Everything we do here will be run in parallel in another execution context. 
            // Remember that this function will be executed in the thread's context, 
            // so you cannot reference any value of the surrounding code. 
            var request = require("request");

            var prices = {};

            function loadPrices() {
                let success = false;

                loadbitcoinaverage();

                //loadbitpay();
                //loadblockchain();
                //loadbitcoincharts();


            }

            function loadbitcoinaverage() {

                request({
                    url: 'https://api.bitcoinaverage.com/ticker/global/all',
                    json: true
                }, function (error, response, body) {
                    if (!error && response.statusCode === 200) {
                        for(var currency in body) {
                            prices[currency] = body[currency].last;
                        }
                        progress({name: 'loadbitcoinaverage', prices: prices});
                    } else {
                        console.log(error);
                    }
                });
            }

            let minuteInterval = 15;
            loadPrices();
            setInterval(()=>{
                loadPrices();
            }, minuteInterval*60*1000);

          done();
        });

        this.btcPriceThread
            .send()
            .on('progress', (prices) => {
                this.prices = prices.prices;
                console.log(`Refreshed ${prices.name}`);
            })
            .on('done', () => {
                console.log('Completed getting Bitcoin prices.');
            });


        this.keepRunning = true;
       /// BtcPrice.__instance = self
    }


    closethread() {
        this.btcPriceThread.destroy();
    }

    get(currency, refreshRates) {
        /**
        :param currency: an upper case 3 letter currency code
        :return: a floating point number representing the exchange rate from BTC => currency
        **/
        let last = 0;
        if(refreshRates === undefined) {
            refreshRates = false;
        }
        if(refreshRates) {
            this.loadPrices();
        }
        if(this.prices.length != 0) {
            last = this.prices[currency];
        }

        return last;
    }

    run() {
        let minuteInterval = 15;
        this.loadPrices();
        setInterval(()=>{
            this.loadPrices();
        }, minuteInterval*60*1000);
    }

    start() {
        this.btcPriceThread.eval('', function(err, result) {
            console.log(err);
        });
    }




    // def loadbitpay(self):
    //     for currency in self.dictForUrl('https://bitpay.com/api/rates'):
    //         self.prices[currency["code"]] = currency["rate"]

    // def loadblockchain(self):
    //     for currency, info in self.dictForUrl('https://blockchain.info/ticker').iteritems():
    //         self.prices[currency] = info["last"]

    // def loadbitcoincharts(self):
    //     for currency, info in self.dictForUrl('https://api.bitcoincharts.com/v1/weighted_prices.json').iteritems():
    //         if currency != "timestamp":
    //             self.prices[currency
}

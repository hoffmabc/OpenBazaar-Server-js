(function(global, factory) {
    /* eslint-disable no-undef */

    /* AMD */ if (typeof define === 'function' && define.amd)
        define(["protobuf"], factory);
    
    /* CommonJS */ else if (typeof require === 'function' && typeof module === 'object' && module && module.exports)
        module.exports = factory(require("protobufjs/runtime"));

    /* eslint-enable no-undef */
})(this, function($protobuf) {
    "use strict"; // eslint-disable-line strict

    var $root = protobuf.Root.fromJSON({
          "nested": {
            "Contract": {
              "fields": {
                "vendorOffer": {
                  "type": "VendorOffer",
                  "id": 1
                },
                "buyerOrder": {
                  "type": "BuyerOrder",
                  "id": 2
                },
                "vendorOrderConfirmation": {
                  "type": "VendorOrderConfirmation",
                  "id": 3
                },
                "buyerReceipt": {
                  "type": "BuyerReceipt",
                  "id": 4
                },
                "disputeResolution": {
                  "type": "DisputeResolution",
                  "id": 5
                }
              }
            },
            "VendorOffer": {
              "fields": {
                "listing": {
                  "type": "Listing",
                  "id": 1
                },
                "signatures": {
                  "type": "Signatures",
                  "id": 2
                }
              },
              "nested": {
                "Listing": {
                  "fields": {
                    "contractId": {
                      "type": "string",
                      "id": 1
                    },
                    "id": {
                      "type": "ID",
                      "id": 2
                    },
                    "metadata": {
                      "type": "Metadata",
                      "id": 3
                    },
                    "item": {
                      "type": "Item",
                      "id": 4
                    },
                    "shipping": {
                      "type": "Shipping",
                      "id": 5
                    },
                    "moderators": {
                      "rule": "repeated",
                      "type": "Moderator",
                      "id": 6,
                      "options": {
                        "packed": true
                      }
                    }
                  },
                  "nested": {
                    "ID": {
                      "fields": {
                        "guid": {
                          "type": "string",
                          "id": 1
                        },
                        "blockchainId": {
                          "type": "string",
                          "id": 2
                        },
                        "pubkeys": {
                          "type": "Pubkeys",
                          "id": 3
                        }
                      },
                      "nested": {
                        "Pubkeys": {
                          "fields": {
                            "guid": {
                              "type": "string",
                              "id": 1
                            },
                            "bitcoin": {
                              "type": "string",
                              "id": 2
                            }
                          }
                        }
                      }
                    },
                    "Metadata": {
                      "fields": {
                        "version": {
                          "type": "string",
                          "id": 1
                        },
                        "category": {
                          "type": "Category",
                          "id": 2
                        },
                        "categorySub": {
                          "type": "CategorySub",
                          "id": 3
                        },
                        "expiry": {
                          "type": "Timestamp",
                          "id": 4
                        }
                      },
                      "nested": {
                        "CategorySub": {
                          "values": {
                            "FIXED_PRICE": 0,
                            "AUCTION": 1
                          }
                        },
                        "Category": {
                          "values": {
                            "PHYSICAL_GOOD": 0,
                            "DIGITAL_GOOD": 1,
                            "SERVICE": 2
                          }
                        }
                      }
                    },
                    "Item": {
                      "fields": {
                        "title": {
                          "type": "string",
                          "id": 1
                        },
                        "description": {
                          "type": "string",
                          "id": 2
                        },
                        "processTime": {
                          "type": "string",
                          "id": 3
                        },
                        "pricePerUnit": {
                          "type": "PPU",
                          "id": 4
                        },
                        "nsfw": {
                          "type": "bool",
                          "id": 5
                        },
                        "keywords": {
                          "rule": "repeated",
                          "type": "string",
                          "id": 6,
                          "options": {
                            "packed": true
                          }
                        },
                        "imageHashes": {
                          "rule": "repeated",
                          "type": "string",
                          "id": 7,
                          "options": {
                            "packed": true
                          }
                        },
                        "SKU": {
                          "type": "string",
                          "id": 8
                        },
                        "condition": {
                          "type": "string",
                          "id": 9
                        },
                        "options": {
                          "rule": "repeated",
                          "type": "Options",
                          "id": 10,
                          "options": {
                            "packed": true
                          }
                        }
                      }
                    },
                    "PPU": {
                      "fields": {
                        "bitcoin": {
                          "type": "float",
                          "id": 1
                        },
                        "fiat": {
                          "type": "Fiat",
                          "id": 2
                        }
                      },
                      "nested": {
                        "Fiat": {
                          "fields": {
                            "currencyCode": {
                              "type": "string",
                              "id": 1
                            },
                            "price": {
                              "type": "float",
                              "id": 2
                            }
                          }
                        }
                      }
                    },
                    "Options": {
                      "fields": {
                        "x": {
                          "type": "string",
                          "id": 1
                        },
                        "y": {
                          "rule": "repeated",
                          "type": "string",
                          "id": 2,
                          "options": {
                            "packed": true
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "Signatures": {
              "fields": {
                "guid": {
                  "type": "bytes",
                  "id": 1
                },
                "bitcoin": {
                  "type": "bytes",
                  "id": 2
                }
              }
            },
            "Node": {
              "fields": {
                "guid": {
                  "type": "bytes",
                  "id": 1
                },
                "publicKey": {
                  "type": "bytes",
                  "id": 2
                },
                "natType": {
                  "type": "NATType",
                  "id": 3
                },
                "nodeAddress": {
                  "type": "IPAddress",
                  "id": 4
                },
                "relayAddress": {
                  "type": "IPAddress",
                  "id": 5
                },
                "vendor": {
                  "type": "bool",
                  "id": 6
                }
              },
              "nested": {
                "IPAddress": {
                  "fields": {
                    "ip": {
                      "type": "string",
                      "id": 1
                    },
                    "port": {
                      "type": "uint32",
                      "id": 2
                    }
                  }
                }
              }
            },
            "NATType": {
              "values": {
                "FULL_CONE": 0,
                "RESTRICTED": 1,
                "SYMMETRIC": 2
              }
            },
            "Value": {
              "fields": {
                "keyword": {
                  "type": "bytes",
                  "id": 1
                },
                "valueKey": {
                  "type": "bytes",
                  "id": 2
                },
                "serializedData": {
                  "type": "bytes",
                  "id": 3
                },
                "ttl": {
                  "type": "uint32",
                  "id": 4
                }
              }
            },
            "Inv": {
              "fields": {
                "keyword": {
                  "type": "bytes",
                  "id": 1
                },
                "valueKey": {
                  "type": "bytes",
                  "id": 2
                }
              }
            },
            "Profile": {
              "fields": {
                "name": {
                  "type": "string",
                  "id": 1
                },
                "location": {
                  "type": "CountryCode",
                  "id": 2
                },
                "guidKey": {
                  "type": "PublicKey",
                  "id": 3
                },
                "bitcoinKey": {
                  "type": "PublicKey",
                  "id": 4
                },
                "nsfw": {
                  "type": "bool",
                  "id": 5
                },
                "vendor": {
                  "type": "bool",
                  "id": 6
                },
                "moderator": {
                  "type": "bool",
                  "id": 7
                },
                "moderationFee": {
                  "type": "float",
                  "id": 8
                },
                "handle": {
                  "type": "string",
                  "id": 9
                },
                "about": {
                  "type": "string",
                  "id": 10
                },
                "shortDescription": {
                  "type": "string",
                  "id": 11
                },
                "website": {
                  "type": "string",
                  "id": 12
                },
                "email": {
                  "type": "string",
                  "id": 13
                },
                "social": {
                  "rule": "repeated",
                  "type": "SocialAccount",
                  "id": 14,
                  "options": {
                    "packed": true
                  }
                },
                "primaryColor": {
                  "type": "uint32",
                  "id": 15
                },
                "secondaryColor": {
                  "type": "uint32",
                  "id": 16
                },
                "backgroundColor": {
                  "type": "uint32",
                  "id": 17
                },
                "textColor": {
                  "type": "uint32",
                  "id": 18
                },
                "followerCount": {
                  "type": "uint32",
                  "id": 19
                },
                "followingCount": {
                  "type": "uint32",
                  "id": 20
                },
                "pgpKey": {
                  "type": "PublicKey",
                  "id": 21
                },
                "avatarHash": {
                  "type": "bytes",
                  "id": 22
                },
                "headerHash": {
                  "type": "bytes",
                  "id": 23
                },
                "lastModified": {
                  "type": "uint64",
                  "id": 24
                }
              },
              "nested": {
                "SocialAccount": {
                  "fields": {
                    "type": {
                      "type": "SocialType",
                      "id": 1
                    },
                    "username": {
                      "type": "string",
                      "id": 2
                    },
                    "proofUrl": {
                      "type": "string",
                      "id": 3
                    }
                  },
                  "nested": {
                    "SocialType": {
                      "values": {
                        "FACEBOOK": 0,
                        "TWITTER": 1,
                        "INSTAGRAM": 2,
                        "SNAPCHAT": 3
                      }
                    }
                  }
                },
                "PublicKey": {
                  "fields": {
                    "publicKey": {
                      "type": "bytes",
                      "id": 1
                    },
                    "signature": {
                      "type": "bytes",
                      "id": 2
                    }
                  }
                }
              }
            },
            "Metadata": {
              "fields": {
                "name": {
                  "type": "string",
                  "id": 1
                },
                "handle": {
                  "type": "string",
                  "id": 2
                },
                "shortDescription": {
                  "type": "string",
                  "id": 3
                },
                "avatarHash": {
                  "type": "bytes",
                  "id": 4
                },
                "nsfw": {
                  "type": "bool",
                  "id": 5
                }
              }
            },
            "Listings": {
              "fields": {
                "listing": {
                  "rule": "repeated",
                  "type": "ListingMetadata",
                  "id": 1,
                  "options": {
                    "packed": true
                  }
                },
                "handle": {
                  "type": "string",
                  "id": 2
                },
                "avatarHash": {
                  "type": "bytes",
                  "id": 3
                }
              },
              "nested": {
                "ListingMetadata": {
                  "fields": {
                    "contractHash": {
                      "type": "bytes",
                      "id": 1
                    },
                    "title": {
                      "type": "string",
                      "id": 2
                    },
                    "thumbnailHash": {
                      "type": "bytes",
                      "id": 3
                    },
                    "category": {
                      "type": "string",
                      "id": 4
                    },
                    "price": {
                      "type": "float",
                      "id": 5
                    },
                    "currencyCode": {
                      "type": "string",
                      "id": 6
                    },
                    "nsfw": {
                      "type": "bool",
                      "id": 7
                    },
                    "origin": {
                      "type": "CountryCode",
                      "id": 8
                    },
                    "shipsTo": {
                      "rule": "repeated",
                      "type": "CountryCode",
                      "id": 9,
                      "options": {
                        "packed": true
                      }
                    },
                    "avatarHash": {
                      "type": "bytes",
                      "id": 10
                    },
                    "handle": {
                      "type": "string",
                      "id": 11
                    },
                    "contractType": {
                      "type": "ContractType",
                      "id": 12
                    },
                    "lastModified": {
                      "type": "uint64",
                      "id": 13
                    },
                    "pinned": {
                      "type": "bool",
                      "id": 14
                    },
                    "hidden": {
                      "type": "bool",
                      "id": 15
                    }
                  }
                },
                "ContractType": {
                  "values": {
                    "NOT_SET": 0,
                    "PHYSICAL_GOOD": 1,
                    "DIGITAL_GOOD": 2,
                    "SERVICE": 3
                  }
                }
              }
            },
            "Followers": {
              "fields": {
                "followers": {
                  "rule": "repeated",
                  "type": "Follower",
                  "id": 1,
                  "options": {
                    "packed": true
                  }
                }
              },
              "nested": {
                "Follower": {
                  "fields": {
                    "guid": {
                      "type": "bytes",
                      "id": 1
                    },
                    "following": {
                      "type": "bytes",
                      "id": 2
                    },
                    "pubkey": {
                      "type": "bytes",
                      "id": 3
                    },
                    "metadata": {
                      "type": "Metadata",
                      "id": 4
                    },
                    "signature": {
                      "type": "bytes",
                      "id": 5
                    }
                  }
                }
              }
            },
            "Following": {
              "fields": {
                "users": {
                  "rule": "repeated",
                  "type": "User",
                  "id": 1,
                  "options": {
                    "packed": true
                  }
                }
              },
              "nested": {
                "User": {
                  "fields": {
                    "guid": {
                      "type": "bytes",
                      "id": 1
                    },
                    "pubkey": {
                      "type": "bytes",
                      "id": 2
                    },
                    "metadata": {
                      "type": "Metadata",
                      "id": 3
                    },
                    "signature": {
                      "type": "bytes",
                      "id": 4
                    }
                  }
                }
              }
            },
            "PlaintextMessage": {
              "fields": {
                "senderGuid": {
                  "type": "bytes",
                  "id": 1
                },
                "handle": {
                  "type": "string",
                  "id": 2
                },
                "pubkey": {
                  "type": "bytes",
                  "id": 3
                },
                "subject": {
                  "type": "string",
                  "id": 4
                },
                "type": {
                  "type": "Type",
                  "id": 5
                },
                "message": {
                  "type": "string",
                  "id": 6
                },
                "timestamp": {
                  "type": "uint64",
                  "id": 7
                },
                "avatarHash": {
                  "type": "bytes",
                  "id": 8
                },
                "signature": {
                  "type": "bytes",
                  "id": 9
                }
              },
              "nested": {
                "Type": {
                  "values": {
                    "CHAT": 0,
                    "ORDER": 1,
                    "DISPUTE_OPEN": 2,
                    "DISPUTE_CLOSE": 3,
                    "ORDER_CONFIRMATION": 4,
                    "RECEIPT": 5,
                    "REFUND": 6
                  }
                }
              }
            },
            "CountryCode": {
              "values": {
                "NA": 0,
                "ALL": 1,
                "NORTH_AMERICA": 2,
                "SOUTH_AMERICA": 3,
                "EUROPE": 4,
                "AFRICA": 5,
                "ASIA": 6,
                "ALBANIA": 7,
                "ALGERIA": 8,
                "AMERICAN_SAMOA": 9,
                "ANDORRA": 10,
                "ANGOLA": 11,
                "ANGUILLA": 12,
                "ANTIGUA": 13,
                "ARGENTINA": 14,
                "ARMENIA": 15,
                "ARUBA": 16,
                "AUSTRALIA": 17,
                "AUSTRIA": 18,
                "AZERBAIJAN": 19,
                "BAHAMAS": 20,
                "BAHRAIN": 21,
                "BANGLADESH": 22,
                "BARBADOS": 23,
                "BELARUS": 24,
                "BELGIUM": 25,
                "BELIZE": 26,
                "BENIN": 27,
                "BERMUDA": 28,
                "BHUTAN": 29,
                "BOLIVIA": 30,
                "BONAIRE_SINT_EUSTATIUS_SABA": 31,
                "BOSNIA": 32,
                "BOTSWANA": 33,
                "BOUVET_ISLAND": 34,
                "BRAZIL": 35,
                "BRITISH_INDIAN_OCEAN_TERRITORY": 36,
                "BRUNEI_DARUSSALAM": 37,
                "BULGARIA": 38,
                "BURKINA_FASO": 39,
                "BURUNDI": 40,
                "CABO_VERDE": 41,
                "CAMBODIA": 42,
                "CAMEROON": 43,
                "CANADA": 44,
                "CAYMAN_ISLANDS": 45,
                "CENTRAL_AFRICAN_REPUBLIC": 46,
                "CHAD": 47,
                "CHILE": 48,
                "CHINA": 49,
                "CHRISTMAS_ISLAND": 50,
                "COCOS_ISLANDS": 51,
                "COLOMBIA": 52,
                "COMOROS": 53,
                "CONGO_REPUBLIC": 54,
                "CONGO": 55,
                "COOK_ISLANDS": 56,
                "COSTA_RICA": 57,
                "COTE_DIVOIRE": 58,
                "CROATIA": 59,
                "CUBA": 60,
                "CURACAO": 61,
                "CYPRUS": 62,
                "CZECH_REPUBLIC": 63,
                "DENMARK": 64,
                "DJIBOUTI": 65,
                "DOMINICA": 66,
                "DOMINICAN_REPUBLIC": 67,
                "ECUADOR": 68,
                "EGYPT": 69,
                "EL_SALVADOR": 70,
                "EQUATORIAL_GUINEA": 71,
                "ERITREA": 72,
                "ESTONIA": 73,
                "ETHIOPIA": 74,
                "FALKLAND_ISLANDS": 75,
                "FAROE_ISLANDS": 76,
                "FIJI": 77,
                "FINLAND": 78,
                "FRANCE": 79,
                "FRENCH_GUIANA": 80,
                "FRENCH_POLYNESIA": 81,
                "FRENCH_SOUTHERN_TERRITORIES": 82,
                "GABON": 83,
                "GAMBIA": 84,
                "GEORGIA": 85,
                "GERMANY": 86,
                "GHANA": 87,
                "GIBRALTAR": 88,
                "GREECE": 89,
                "GREENLAND": 90,
                "GRENADA": 91,
                "GUADELOUPE": 92,
                "GUAM": 93,
                "GUATEMALA": 94,
                "GUERNSEY": 95,
                "GUINEA": 96,
                "GUINEA_BISSAU": 97,
                "GUYANA": 98,
                "HAITI": 99,
                "HEARD_ISLAND": 100,
                "HOLY_SEE": 101,
                "HONDURAS": 102,
                "HONG_KONG": 103,
                "HUNGARY": 104,
                "ICELAND": 105,
                "INDIA": 106,
                "INDONESIA": 107,
                "IRAN": 108,
                "IRAQ": 109,
                "IRELAND": 110,
                "ISLE_OF_MAN": 111,
                "ISRAEL": 112,
                "ITALY": 113,
                "JAMAICA": 114,
                "JAPAN": 115,
                "JERSEY": 116,
                "JORDAN": 117,
                "KAZAKHSTAN": 118,
                "KENYA": 119,
                "KIRIBATI": 120,
                "NORTH_KOREA": 121,
                "SOUTH_KOREA": 122,
                "KUWAIT": 123,
                "KYRGYZSTAN": 124,
                "LAO": 125,
                "LATVIA": 126,
                "LEBANON": 127,
                "LESOTHO": 128,
                "LIBERIA": 129,
                "LIBYA": 130,
                "LIECHTENSTEIN": 131,
                "LITHUANIA": 132,
                "LUXEMBOURG": 133,
                "MACAO": 134,
                "MACEDONIA": 135,
                "MADAGASCAR": 136,
                "MALAWI": 137,
                "MALAYSIA": 138,
                "MALDIVES": 139,
                "MALI": 140,
                "MALTA": 141,
                "MARSHALL_ISLANDS": 142,
                "MARTINIQUE": 143,
                "MAURITANIA": 144,
                "MAURITIUS": 145,
                "MAYOTTE": 146,
                "MEXICO": 147,
                "MICRONESIA": 148,
                "MOLDOVA": 149,
                "MONACO": 150,
                "MONGOLIA": 151,
                "MONTENEGRO": 152,
                "MONTSERRAT": 153,
                "MOROCCO": 154,
                "MOZAMBIQUE": 155,
                "MYANMAR": 156,
                "NAMIBIA": 157,
                "NAURU": 158,
                "NEPAL": 159,
                "NETHERLANDS": 160,
                "NEW_CALEDONIA": 161,
                "NEW_ZEALAND": 162,
                "NICARAGUA": 163,
                "NIGER": 164,
                "NIGERIA": 165,
                "NIUE": 166,
                "NORFOLK_ISLAND": 167,
                "NORTHERN_MARIANA_ISLANDS": 168,
                "NORWAY": 169,
                "OMAN": 170,
                "PAKISTAN": 171,
                "PALAU": 172,
                "PANAMA": 173,
                "PAPUA_NEW_GUINEA": 174,
                "PARAGUAY": 175,
                "PERU": 176,
                "PHILIPPINES": 177,
                "PITCAIRN": 178,
                "POLAND": 179,
                "PORTUGAL": 180,
                "PUERTO_RICO": 181,
                "QATAR": 182,
                "REUNION": 183,
                "ROMANIA": 184,
                "RUSSIA": 185,
                "RWANDA": 186,
                "SAINT_BARTHELEMY": 187,
                "SAINT_HELENA": 188,
                "SAINT_KITTS": 189,
                "SAINT_LUCIA": 190,
                "SAINT_MARTIN": 191,
                "SAINT_PIERRE": 192,
                "SAINT_VINCENT": 193,
                "SAMOA": 194,
                "SAN_MARINO": 195,
                "SAO_TOME": 196,
                "SAUDI_ARABIA": 197,
                "SENEGAL": 198,
                "SERBIA": 199,
                "SEYCHELLES": 200,
                "SIERRA_LEONE": 201,
                "SINGAPORE": 202,
                "SINT_MAARTEN": 203,
                "SUCRE": 204,
                "SLOVAKIA": 205,
                "SLOVENIA": 206,
                "SOLOMON_ISLANDS": 207,
                "SOMALIA": 208,
                "SOUTH_AFRICA": 209,
                "SOUTH_SUDAN": 210,
                "SPAIN": 211,
                "SRI_LANKA": 212,
                "SUDAN": 213,
                "SURINAME": 214,
                "SVALBARD": 215,
                "SWAZILAND": 216,
                "SWEDEN": 217,
                "SWITZERLAND": 218,
                "SYRIAN_ARAB_REPUBLIC": 219,
                "TAIWAN": 220,
                "TAJIKISTAN": 221,
                "TANZANIA": 222,
                "THAILAND": 223,
                "TIMOR_LESTE": 224,
                "TOGO": 225,
                "TOKELAU": 226,
                "TONGA": 227,
                "TRINIDAD": 228,
                "TUNISIA": 229,
                "TURKEY": 230,
                "TURKMENISTAN": 231,
                "TURKS_AND_CAICOS_ISLANDS": 232,
                "TUVALU": 233,
                "UGANDA": 234,
                "UKRAINE": 235,
                "UNITED_ARAB_EMIRATES": 236,
                "UNITED_KINGDOM": 237,
                "UNITED_STATES": 238,
                "URUGUAY": 239,
                "UZBEKISTAN": 240,
                "VANUATU": 241,
                "VENEZUELA": 242,
                "VIETNAM": 243,
                "VIRGIN_ISLANDS_BRITISH": 244,
                "VIRGIN_ISLANDS_US": 245,
                "WALLIS_AND_FUTUNA": 246,
                "WESTERN_SAHARA": 247,
                "YEMEN": 248,
                "ZAMBIA": 249,
                "ZIMBABWE": 250,
                "AFGHANISTAN": 251,
                "ALAND_ISLANDS": 252
              }
            },
            "Message": {
              "fields": {
                "messageID": {
                  "type": "bytes",
                  "id": 1
                },
                "sender": {
                  "type": "Node",
                  "id": 2
                },
                "command": {
                  "type": "Command",
                  "id": 3
                },
                "protoVer": {
                  "type": "uint32",
                  "id": 4
                },
                "arguments": {
                  "rule": "repeated",
                  "type": "bytes",
                  "id": 5,
                  "options": {
                    "packed": true
                  }
                },
                "testnet": {
                  "type": "bool",
                  "id": 6
                },
                "signature": {
                  "type": "bytes",
                  "id": 7
                }
              }
            },
            "Command": {
              "values": {
                "PING": 0,
                "STUN": 1,
                "HOLE_PUNCH": 2,
                "STORE": 3,
                "DELETE": 4,
                "INV": 5,
                "VALUES": 6,
                "BROADCAST": 7,
                "MESSAGE": 8,
                "FOLLOW": 9,
                "UNFOLLOW": 10,
                "ORDER": 11,
                "ORDER_CONFIRMATION": 12,
                "COMPLETE_ORDER": 13,
                "FIND_NODE": 14,
                "FIND_VALUE": 15,
                "GET_CONTRACT": 16,
                "GET_IMAGE": 17,
                "GET_PROFILE": 18,
                "GET_LISTINGS": 19,
                "GET_USER_METADATA": 20,
                "GET_CONTRACT_METADATA": 21,
                "GET_FOLLOWING": 22,
                "GET_FOLLOWERS": 23,
                "GET_RATINGS": 24,
                "DISPUTE_OPEN": 25,
                "DISPUTE_CLOSE": 26,
                "REFUND": 27,
                "BAD_REQUEST": 400,
                "NOT_FOUND": 404,
                "CALM_DOWN": 420,
                "UNKNOWN_ERROR": 520
              }
            }
          }
        });

    $protobuf.roots["default"] = $root;

    return $root;
});

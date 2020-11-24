/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

"use strict"

/**
 * Create event test data
 */

exports.entities_feed = {
    entities: {
        media: [{
            "display_url": "somtestpicture.com/fakepic.jpg",
            "expanded_url": "https://sometestpicture.com/fakepic.jpg",
            "id": 12345678901234567890,
            "id_str": "12345678901234567890",
            "indices": [
                13,
                36
            ],
            "media_url": "http://sometestpicture.com/fakepic.jpg",
            "media_url_https": "https://sometestpicture.com/fakepic.jpg",
            "sizes": {
                "thumb": {
                    "h": 150,
                    "resize": "crop",
                    "w": 150
                },
                "large": {
                    "h": 1366,
                    "resize": "fit",
                    "w": 2048
                },
                "medium": {
                    "h": 800,
                    "resize": "fit",
                    "w": 1200
                },
                "small": {
                    "h": 454,
                    "resize": "fit",
                    "w": 680
                }
            },
            "type": "photo",
            "url": "https://somefakeurl.co",
        }]
    }
};

exports.extended_entiies_feed = {
    "entities": {
        "hashtags": [{
            "text": "hashtag",
            "indices": [
              59,
              67
            ]
        }],
        "urls": [{
            "url": "http://sometestpicture.com/fakepic.jpg",
            "expanded_url": "https://sometestpicture.com/fakepic.jpg",
            "unwound": {
              "url": "https://somefakeurl.co",
              "status": 200,
              "title": "Fake title for testing",
              "description": "Dummy description, that has no real-world relevance"
            },
            "indices": [
              35,
              58
            ]
        }],
        "media": [{
            "id": 12345678901234567890,
            "id_str": "12345678901234567890",
            "indices": [
                68,
                91
            ],
            "media_url": "http://sometestpicture.com/fakepic.jpg",
            "media_url_https": "https://sometestpicture.com/fakepic.jpg",
            "url": "https://somefakeurl.co",
            "type": "photo",
            "sizes": {
                "medium": {
                    "w": 1200,
                    "h": 900,
                    "resize": "fit"
                },
                "small": {
                    "w": 680,
                    "h": 510,
                    "resize": "fit"
                },
                "thumb": {
                    "w": 150,
                    "h": 150,
                    "resize": "crop"
                },
                "large": {
                    "w": 2048,
                    "h": 1536,
                    "resize": "fit"
                }
            }
        }]
      }, "extended_entities": {
        "media": [
          {
            "id": 123456789011234567890,
            "id_str": "123456789011234567890",
            "indices": [
              68,
              91
            ],
            "media_url": "http://sometestpicture.com/fakepic.jpg",
            "media_url_https": "https://sometestpicture.com/fakepic.jpg",
            "url": "https://somefakeurl.co",
            "type": "photo",
            "sizes": {
              "medium": {
                "w": 1200,
                "h": 900,
                "resize": "fit"
              },
              "small": {
                "w": 680,
                "h": 510,
                "resize": "fit"
              },
              "thumb": {
                "w": 150,
                "h": 150,
                "resize": "crop"
              },
              "large": {
                "w": 2048,
                "h": 1536,
                "resize": "fit"
              }
            }
          },
          {
            "id": 1234567890134567891,
            "id_str": "1234567890134567891",
            "indices": [
              68,
              91
            ],
            "media_url": "http://sometestpicture.com/fakepic1.jpg",
            "media_url_https": "https://sometestpicture.com/fakepic1.jpg",
            "type": "photo",
            "sizes": {
              "small": {
                "w": 680,
                "h": 680,
                "resize": "fit"
              },
              "thumb": {
                "w": 150,
                "h": 150,
                "resize": "crop"
              },
              "medium": {
                "w": 1200,
                "h": 1200,
                "resize": "fit"
              },
              "large": {
                "w": 2048,
                "h": 2048,
                "resize": "fit"
              }
            }
          },
          {
            "id": 1234567890134567892,
            "id_str": "1234567890134567892",
            "indices": [
              68,
              91
            ],
            "media_url": "http://sometestpicture.com/fakepic2.jpg",
            "media_url_https": "https://sometestpicture.com/fakepic2.jpg",
            "type": "photo",
            "sizes": {
              "medium": {
                "w": 1200,
                "h": 900,
                "resize": "fit"
              },
              "small": {
                "w": 680,
                "h": 510,
                "resize": "fit"
              },
              "thumb": {
                "w": 150,
                "h": 150,
                "resize": "crop"
              },
              "large": {
                "w": 2048,
                "h": 1536,
                "resize": "fit"
              }
            }
          }
    ]}
};

exports.extended_entiies_feed_with_http = {
  "entities": {
      "hashtags": [{
          "text": "hashtag",
          "indices": [
            59,
            67
          ]
      }],
      "urls": [{
          "url": "http://sometestpicture.com/fakepic.jpg",
          "expanded_url": "https://sometestpicture.com/fakepic.jpg",
          "unwound": {
            "url": "https://somefakeurl.co",
            "status": 200,
            "title": "Fake title for testing",
            "description": "Dummy description, that has no real-world relevance"
          },
          "indices": [
            35,
            58
          ]
      }],
      "media": [{
          "id": 12345678901234567890,
          "id_str": "12345678901234567890",
          "indices": [
              68,
              91
          ],
          "media_url": "http://sometestpicture.com/fakepic.jpg",
          "url": "https://somefakeurl.co",
          "type": "photo",
          "sizes": {
              "medium": {
                  "w": 1200,
                  "h": 900,
                  "resize": "fit"
              },
              "small": {
                  "w": 680,
                  "h": 510,
                  "resize": "fit"
              },
              "thumb": {
                  "w": 150,
                  "h": 150,
                  "resize": "crop"
              },
              "large": {
                  "w": 2048,
                  "h": 1536,
                  "resize": "fit"
              }
          }
      }]
    }, "extended_entities": {
      "media": [
        {
          "id": 123456789011234567890,
          "id_str": "123456789011234567890",
          "indices": [
            68,
            91
          ],
          "media_url": "http://sometestpicture.com/fakepic.jpg",
          "url": "https://somefakeurl.co",
          "type": "photo",
          "sizes": {
            "medium": {
              "w": 1200,
              "h": 900,
              "resize": "fit"
            },
            "small": {
              "w": 680,
              "h": 510,
              "resize": "fit"
            },
            "thumb": {
              "w": 150,
              "h": 150,
              "resize": "crop"
            },
            "large": {
              "w": 2048,
              "h": 1536,
              "resize": "fit"
            }
          }
        },
        {
          "id": 1234567890134567891,
          "id_str": "1234567890134567891",
          "indices": [
            68,
            91
          ],
          "media_url": "http://sometestpicture.com/fakepic1.jpg",
          "type": "photo",
          "sizes": {
            "small": {
              "w": 680,
              "h": 680,
              "resize": "fit"
            },
            "thumb": {
              "w": 150,
              "h": 150,
              "resize": "crop"
            },
            "medium": {
              "w": 1200,
              "h": 1200,
              "resize": "fit"
            },
            "large": {
              "w": 2048,
              "h": 2048,
              "resize": "fit"
            }
          }
        },
        {
          "id": 1234567890134567892,
          "id_str": "1234567890134567892",
          "indices": [
            68,
            91
          ],
          "media_url": "http://sometestpicture.com/fakepic2.jpg",
          "type": "photo",
          "sizes": {
            "medium": {
              "w": 1200,
              "h": 900,
              "resize": "fit"
            },
            "small": {
              "w": 680,
              "h": 510,
              "resize": "fit"
            },
            "thumb": {
              "w": 150,
              "h": 150,
              "resize": "crop"
            },
            "large": {
              "w": 2048,
              "h": 1536,
              "resize": "fit"
            }
          }
        }
  ]}
};

exports.entities_feed_http = {
  "entities": {
      "hashtags": [{
          "text": "hashtag",
          "indices": [
            59,
            67
          ]
      }],
      "urls": [{
          "url": "http://sometestpicture.com/fakepic.jpg",
          "expanded_url": "https://sometestpicture.com/fakepic.jpg",
          "unwound": {
            "url": "https://somefakeurl.co",
            "status": 200,
            "title": "Fake title for testing",
            "description": "Dummy description, that has no real-world relevance"
          },
          "indices": [
            35,
            58
          ]
      }],
      "media": [{
          "id": 12345678901234567890,
          "id_str": "12345678901234567890",
          "indices": [
              68,
              91
          ],
          "media_url": "http://sometestpicture.com/fakepic.jpg",
          "url": "https://somefakeurl.co",
          "type": "photo",
          "sizes": {
              "medium": {
                  "w": 1200,
                  "h": 900,
                  "resize": "fit"
              },
              "small": {
                  "w": 680,
                  "h": 510,
                  "resize": "fit"
              },
              "thumb": {
                  "w": 150,
                  "h": 150,
                  "resize": "crop"
              },
              "large": {
                  "w": 2048,
                  "h": 1536,
                  "resize": "fit"
              }
          }
      }]
    }
};

exports.event_with_entities = {
    feed: {...{id_str: '12345678901234567890'}, ...this.entities_feed}
};

exports.event_with_entities_for_no_rek_labels = {
  feed: {...{id_str: '12345678901234567890'}, ...this.entities_feed_http}
};
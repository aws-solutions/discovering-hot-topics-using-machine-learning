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

const sinon = require('sinon');
const expect = require('chai').expect;
const StreamAnalayzer = require('../util/stream-analyzer');
const __test__ = require('./event-feed-test-data');

describe ('To retrieve media entity from twitter feeds', () => {

    it ('should get media attribte from feed', () => {
        expect(StreamAnalayzer.getMediaEntity(__test__.entities_feed)[0].id_str).to.equal('12345678901234567890');
    });

    it ('should get extended media attribute from feed', () => {
        expect(StreamAnalayzer.getMediaEntity(__test__.extended_entiies_feed)[1].id_str).to.equal('1234567890134567891');
    });
});

describe ('Retrieve the media url from the media attributes', () => {
    it ('should get media url from media attribute', () => {
        const media = StreamAnalayzer.getMediaEntity(__test__.entities_feed)[0];
        expect(StreamAnalayzer.getMediaUrl(media)).to.equal('https://sometestpicture.com/fakepic.jpg');
    });

    it ('should get media url from media attribute', () => {
        expect(StreamAnalayzer.getMediaUrl(StreamAnalayzer.getMediaEntity(__test__.extended_entiies_feed)[2])).to.equal('https://sometestpicture.com/fakepic2.jpg');
    });
});

describe ('Retrieve the media http url from the media attributes', () => {
    it ('should get media url from media attribute', () => {
        const media = StreamAnalayzer.getMediaEntity(__test__.entities_feed_http)[0];
        expect(StreamAnalayzer.getMediaUrl(media)).to.equal('http://sometestpicture.com/fakepic.jpg');
    });

    it ('should get media url from media attribute', () => {
        expect(StreamAnalayzer.getMediaUrl(StreamAnalayzer.getMediaEntity(__test__.extended_entiies_feed_with_http)[1])).to.equal('http://sometestpicture.com/fakepic1.jpg');
    });
});
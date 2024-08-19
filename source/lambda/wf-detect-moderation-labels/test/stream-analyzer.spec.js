/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const expect = require('chai').expect;
const StreamAnalayzer = require('../util/stream-analyzer');
const __test__ = require('./event-feed-test-data');

describe('To retrieve media entity from twitter feeds', () => {
    it('should get media attribte from feed', () => {
        expect(StreamAnalayzer.getMediaEntity(__test__.entities_feed)[0].id_str).to.equal('12345678901234567890');
    });

    it('should get extended media attribute from feed', () => {
        expect(StreamAnalayzer.getMediaEntity(__test__.extended_entiies_feed)[1].id_str).to.equal(
            '1234567890134567891'
        );
    });
});

describe('Retrieve the media url from the media attributes', () => {
    it('should get media url from media attribute', () => {
        const media = StreamAnalayzer.getMediaEntity(__test__.entities_feed)[0];
        expect(StreamAnalayzer.getMediaUrl(media)).to.equal('https://sometestpicture.com/fakepic.jpg');
    });

    it('should get media url from media attribute', () => {
        expect(StreamAnalayzer.getMediaUrl(StreamAnalayzer.getMediaEntity(__test__.extended_entiies_feed)[2])).to.equal(
            'https://sometestpicture.com/fakepic2.jpg'
        );
    });
});

describe('Retrieve the media http url from the media attributes', () => {
    it('should get media url from media attribute', () => {
        const media = StreamAnalayzer.getMediaEntity(__test__.entities_feed_http)[0];
        expect(StreamAnalayzer.getMediaUrl(media)).to.equal('http://sometestpicture.com/fakepic.jpg');
    });

    it('should get media url from media attribute', () => {
        expect(
            StreamAnalayzer.getMediaUrl(StreamAnalayzer.getMediaEntity(__test__.extended_entiies_feed_with_http)[1])
        ).to.equal('http://sometestpicture.com/fakepic1.jpg');
    });
});

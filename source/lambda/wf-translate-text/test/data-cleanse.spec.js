/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';
const lambda = require('../');
const expect = require('chai').expect;
const DataCleanse = require('../util/data-cleanse');

describe('When cleansing data', () => {
    it('should flatten multiple lines remove EoLine', async () => {
        const originalText = 'This is one line.\n This is line two. \n This is line three';
        const cleansedText = DataCleanse.removeCREoL(originalText);
        expect(cleansedText).to.equal('This is one line.  This is line two.   This is line three');
    });

    it('should flatten multiple lines and remove return carriage', async () => {
        const originalText = 'This is one line.\r This is line two. \r This is line three';
        const cleansedText = DataCleanse.removeCREoL(originalText);
        expect(cleansedText).to.equal('This is one line.  This is line two.   This is line three');
    });

    it('should flatten multiple lines and remove return carriage and EoLine', async () => {
        const originalText = 'This is one line.\n\r This is line two. \n\r This is line three';
        const cleansedText = DataCleanse.removeCREoL(originalText);
        expect(cleansedText).to.equal('This is one line.  This is line two.   This is line three');
    });

    it('should remove https URL', async () => {
        const dataCleanser = new DataCleanse();
        const originalText = 'Search on https://www.amazon.com';
        const cleansedText = DataCleanse.removeURL(originalText);
        expect(cleansedText).to.equal('Search on ');
    });

    it('should remove http URL', async () => {
        const dataCleanser = new DataCleanse();
        const originalText = 'Search on http://t.test.co';
        const cleansedText = DataCleanse.removeURL(originalText);
        expect(cleansedText).to.equal('Search on ');
    });

    it('should remove punctuation', async () => {
        const dataCleanser = new DataCleanse();
        const originalText = 'This is not good, but can be, overall; great?';
        const cleansedText = DataCleanse.removePunctuation(originalText);
        expect(cleansedText).to.equal('This is not good  but can be  overall  great ');
    });

    it('should remove retweet with user tag', async () => {
        const dataCleanser = new DataCleanse();
        const originalText = 'RT @user This is sample tweet';
        const cleansedText = DataCleanse.removeRTWithUserTag(originalText);
        expect(cleansedText).to.equal(' This is sample tweet');
    });

    it('should remove user tag', async () => {
        const dataCleanser = new DataCleanse();
        const originalText = 'RT @user This is sample tweet';
        const cleansedText = DataCleanse.removeUserSymbol(originalText);
        expect(cleansedText).to.equal('RT user This is sample tweet');
    });

    it('should remove hashtag', async () => {
        const dataCleanser = new DataCleanse();
        const originalText = 'RT @user This #likes is sample tweet';
        const cleansedText = DataCleanse.removeHashtags(originalText);
        expect(cleansedText).to.equal('RT @user This likes is sample tweet');
    });

    it('should remove retweet tag', async () => {
        const dataCleanser = new DataCleanse();
        const originalText = 'RT @user This is sample tweet';
        const cleansedText = DataCleanse.removeRTTag(originalText);
        expect(cleansedText).to.equal('@user This is sample tweet');
    });
});

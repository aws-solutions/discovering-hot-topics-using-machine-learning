/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.orglicenses/LICENSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

'use strict';

class DataCleanse {
    static cleanText(text) {
        return DataCleanse.removeCREoL(
            DataCleanse.removePunctuation(
                DataCleanse.removeURL(
                    DataCleanse.removeRTTag(DataCleanse.removeHashtags(DataCleanse.removeUserSymbol(text)))
                )
            )
        );
    }

    /**
     * Remove new line/ carriage return
     *
     * @param {string} text
     */
    static removeCREoL(text) {
        return text.replace(/(?:[\r\n]+)+/gm, ' ').trim();
    }

    /**
     * Remove URL from text
     *
     * @param {string} text
     */
    static removeURL(text) {
        return text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
    }

    /**
     * Remove Punctuation from text
     *
     * @param {string} text
     */
    static removePunctuation(text) {
        //removed ':' from the list since we wanted to keep timestamp as is
        // This regular expression is to remove certain non-alphabetic characters. hence
        // supressing the SONAR rule
        return text.replace(/[.,\/#!$%\^&\*;{}=\-_`~()?]/g, ' '); // NOSONAR (javascript:S4784)
    }

    /**
     * Remove RT with '@user' Tag from re-tweets
     *
     * @param {string} text
     */
    static removeRTWithUserTag(text) {
        return text.replace(/RT\s*@\S+/g, ''); // NOSONAR (javascript:S4784)
    }

    /**
     * Remove RT Tag from re-tweets
     *
     * @param {string} text
     */
    static removeRTTag(text) {
        return text.replace(/RT\s/g, '');
    }

    /**
     * Remove '@' tag for user handles from tweets
     *
     * @param {string} text
     */
    static removeUserSymbol(text) {
        return text.replace(/@/, '');
    }

    /**
     * Remove hastags from tweet
     *
     * @param {string} text
     */
    static removeHashtags(text) {
        return text.replace(/#/, '');
    }
}

module.exports = DataCleanse;

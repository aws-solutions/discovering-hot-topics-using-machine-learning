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
 * Dummy response for Rek
 */

exports.rekResponse = {
    TextDetections: [
        {
            "Confidence": 90.54900360107422,
            "DetectedText": "IT'S",
            "Geometry": {
                "BoundingBox": {
                    "Height": 0.10317354649305344,
                    "Left": 0.6677391529083252,
                    "Top": 0.17569075524806976,
                    "Width": 0.15113449096679688
                },
                "Polygon": [
                    {
                        "X": 0.6677391529083252,
                        "Y": 0.17569075524806976
                    },
                    {
                        "X": 0.8188736438751221,
                        "Y": 0.17574213445186615
                    },
                    {
                        "X": 0.8188582062721252,
                        "Y": 0.278915673494339
                    },
                    {
                        "X": 0.6677237153053284,
                        "Y": 0.2788642942905426
                    }
                ]
            },
            "Id": 0,
            "Type": "LINE"
        },
        {
            "Confidence": 92.76634979248047,
            "DetectedText": "MONDAY",
            "Geometry": {
                "BoundingBox": {
                    "Height": 0.11997425556182861,
                    "Left": 0.5545867085456848,
                    "Top": 0.34920141100883484,
                    "Width": 0.39841532707214355
                },
                "Polygon": [
                    {
                        "X": 0.5545867085456848,
                        "Y": 0.34920141100883484
                    },
                    {
                        "X": 0.9530020356178284,
                        "Y": 0.3471102714538574
                    },
                    {
                        "X": 0.9532787799835205,
                        "Y": 0.46708452701568604
                    },
                    {
                        "X": 0.554863452911377,
                        "Y": 0.46917566657066345
                    }
                ]
            },
            "Id": 2,
            "Type": "LINE"
        },
        {
            "Confidence": 96.7636489868164,
            "DetectedText": "but keep",
            "Geometry": {
                "BoundingBox": {
                    "Height": 0.0756164938211441,
                    "Left": 0.634815514087677,
                    "Top": 0.5181083083152771,
                    "Width": 0.20877975225448608
                },
                "Polygon": [
                    {
                        "X": 0.634815514087677,
                        "Y": 0.5181083083152771
                    },
                    {
                        "X": 0.8435952663421631,
                        "Y": 0.52589350938797
                    },
                    {
                        "X": 0.8423560857772827,
                        "Y": 0.6015099883079529
                    },
                    {
                        "X": 0.6335763335227966,
                        "Y": 0.59372478723526
                    }
                ]
            },
            "Id": 3,
            "Type": "LINE"
        },
        {
            "Confidence": 99.47185516357422,
            "DetectedText": "Smiling",
            "Geometry": {
                "BoundingBox": {
                    "Height": 0.2814019024372101,
                    "Left": 0.48475268483161926,
                    "Top": 0.6823741793632507,
                    "Width": 0.47539761662483215
                },
                "Polygon": [
                    {
                        "X": 0.48475268483161926,
                        "Y": 0.6823741793632507
                    },
                    {
                        "X": 0.9601503014564514,
                        "Y": 0.587857186794281
                    },
                    {
                        "X": 0.9847385287284851,
                        "Y": 0.8692590594291687
                    },
                    {
                        "X": 0.5093409419059753,
                        "Y": 0.9637760519981384
                    }
                ]
            },
            "Id": 4,
            "Type": "LINE"
        }
    ]
};

exports.rekResponse_with_empty_text_detections = {
    TextDetections: []
};

exports.rekResponse_with_undefined_text_detections = {};
######################################################################################################################

#MIT License

#Copyright (c) 2020 newscatcherapi.com

#Permission is hereby granted, free of charge, to any person obtaining a copy
#of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:

# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

# Original Copyright (c) 2020 newscatcherapi.com. Licensed under the MIT License.
# Modifications Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# Original Code URL - https://github.com/kotartemiy/newscatcher/tree/master/newscatcher                                                                             
######################################################################################################################

# 2023-07-21: Amazon addition.
import sqlite3
import feedparser
import pkg_resources
from tldextract import extract

DB_FILE = pkg_resources.resource_filename('util', 'newscatcher_data/package_rss.db')

class Query:
    # Query class used to build subsequent sql queries
    def __init__(self):
        self.params = {'website': None, 'topic': None}

    def build_conditional(self, field, sql_field):
        # single conditional build
        field = field.lower()
        sql_field = sql_field.lower()

        if self.params[field] != None:
            conditional = "{} = '{}'".format(sql_field, self.params[field])
            return conditional
        return

    def build_where(self):
        # returning the conditional from paramters
        # the post "WHERE"
        conditionals = []

        conv = {'topic': 'topic_unified', 'website': 'clean_url'}

        for field in conv.keys():
            cond = self.build_conditional(field, conv[field])
            if cond != None:
                conditionals.append(cond)

        if conditionals == []:
            return

        conditionals[0] = 'WHERE ' + conditionals[0]
        conditionals = ''' AND '.join([x for x in conditionals if x != None])
		+ ' ORDER BY IFNULL(Globalrank,999999);'''

        return conditionals

    def build_sql(self):
        # build sql on user qeury
        db = sqlite3.connect(DB_FILE, isolation_level=None)
        sql = 'SELECT rss_url from rss_main ' + self.build_where()

        db.close()
        return sql


def clean_url(dirty_url):
    # website.com
    dirty_url = dirty_url.lower()
    o = extract(dirty_url)
    return o.domain + '.' + o.suffix


class Newscatcher:
    # search engine
    def build_sql(self):
        if self.topic is None:
            sql = '''SELECT rss_url from rss_main 
					 WHERE clean_url = '{}';'''
            sql = sql.format(self.url)
            return sql

    def __init__(self, website, topic=None):
        # init with given params
        website = website.lower()
        self.url = clean_url(website)
        self.topic = topic

    def get_news(self, n=None):
        # return results based on current stream
        if self.topic is None:
            sql = '''SELECT rss_url,topic_unified, language, clean_country from rss_main 
					 WHERE clean_url = '{}' AND main = 1;'''
            sql = sql.format(self.url)
        else:
            sql = '''SELECT rss_url, topic_unified, language, clean_country from rss_main 
					 WHERE clean_url = '{}' AND topic_unified = '{}';'''
            sql = sql.format(self.url, self.topic)

        db = sqlite3.connect(DB_FILE, isolation_level=None)

        try:
            rss_endpoint, topic, language, country = db.execute(sql).fetchone()
            feed = feedparser.parse(rss_endpoint)
        except: # NOSONAR: python:S5754
            if self.topic is not None:
                sql = '''SELECT rss_url from rss_main 
					 WHERE clean_url = '{}';'''
                sql = sql.format(self.url)

                if len(db.execute(sql).fetchall()) > 0:
                    db.close()
                    print('Topic is not supported')
                    return
                else:
                    print('Website is not supported')
                    return
                    db.close()
            else:
                print('Website is not supported')
                return

        if feed['entries'] == []:
            db.close()
            print('\nNo results found check internet connection or query parameters\n')
            return

        if n == None or len(feed['entries']) <= n:
            articles = feed['entries']  # ['summary']#[0].keys()
        else:
            articles = feed['entries'][:n]

        db.close()
        return {'url': self.url, 'topic': topic,
                'language': language, 'country': country, 'articles': articles}


def urls(topic=None, language=None, country=None):
    # return urls that matches users parameters
    if language != None:
        language = language.lower()

    if country != None:
        country = country.upper()

    if topic != None:
        topic = topic.lower()

    db = sqlite3.connect(DB_FILE, isolation_level=None)
    quick_q = Query()
    inp = {'topic': topic, 'language': language, 'country': country}
    for x in inp.keys():
        quick_q.params[x] = inp[x]

    conditionals = []
    conv = {'topic': 'topic_unified', 'website': 'clean_url',
            'country': 'clean_country', 'language': 'language'}

    for field in conv.keys():
        try:
            cond = quick_q.build_conditional(field, conv[field])
        except: # NOSONAR: python:S5754
            cond = None

        if cond != None:
            conditionals.append(cond)

    sql = ''

    if conditionals == []:
        sql = 'SELECT clean_url from rss_main '
    else:
        conditionals[0] = ' WHERE ' + conditionals[0]
        conditionals = ' AND '.join([x for x in conditionals if x is not None])
        conditionals += ' AND main = 1 ORDER BY IFNULL(Globalrank,999999);'
        sql = 'SELECT DISTINCT clean_url from rss_main' + conditionals

    ret = db.execute(sql).fetchall()
    if len(ret) == 0:
        print('\nNo websites found for given parameters\n')
        return

    db.close()
    return [x[0] for x in ret]
# End of Amazon addition.
#!/usr/bin/env python

import json

imageEntityId = 0
productOptionsItemEntityId = 0

def parse_product(product):
    global imageEntityId, productOptionsItemEntityId

    product = product['node']
    print('INSERT INTO products(entityId, name, path, brand, description, price) VALUES ({}, "{}", "{}", {}, "{}", {});'.format(
        product['entityId'],
        product['name'],
        product['path'],
        product['brand']['entityId'] if product.get('brand') else 'NULL',
        product['description'].replace('\n', ' ').replace('"', '\\\\\\"').replace("'", '\\\\\\"'),
        float(product['prices']['price']['value']),
    ))
    for i in product['images']['edges']:
        imageEntityId += 1
        print('INSERT INTO images(entityId, productEntityId, urlOriginal, isDefault) VALUES ({}, {}, "{}", {});'.format(
            imageEntityId,
            product['entityId'],
            i['node']['urlOriginal'],
            int(i['node']['isDefault']),
        ))
    for v in product['variants']['edges']:
        print('INSERT INTO variants(entityId, productEntityId, defaultImage) VALUES ({}, {}, {});'.format(
            v['node']['entityId'],
            product['entityId'],
            '"{}"'.format(v['node']['defaultImage']['urlOriginal']) if v['node']['defaultImage'] else 'NULL',
        ))
    for o in product['productOptions']['edges']:
        print('INSERT INTO productOptions(entityId, productEntityId, displayName) VALUES ({}, {}, "{}");'.format(
            o['node']['entityId'],
            product['entityId'],
            o['node']['displayName'],
        ))
        for e in o['node']['values']['edges']:
            productOptionsItemEntityId += 1
            print('INSERT INTO productOptionsItem(entityId, productOptionsEntityId, label, isDefault, hexColors) VALUES ({}, {}, "{}", {}, {});'.format(
                productOptionsItemEntityId,
                o['node']['entityId'],
                e['node']['label'],
                int(e['node'].get('isDefault', False)),
                '"{}"'.format(e['node']['hexColors'][0]) if 'hexColors' in e['node'] else 'NULL',
            ))

def main():
    with open('products.json') as f:
        products = json.load(f)
    for p in products:
        parse_product(p)

if __name__ == '__main__':
    main()

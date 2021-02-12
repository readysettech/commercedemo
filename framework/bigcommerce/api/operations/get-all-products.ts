import type {
  GetAllProductsQuery,
  GetAllProductsQueryVariables,
} from '../../schema'
import type { RecursivePartial, RecursiveRequired } from '../utils/types'
import filterEdges from '../utils/filter-edges'
import setProductLocaleMeta from '../utils/set-product-locale-meta'
import { productConnectionFragment } from '../fragments/product'
import { BigcommerceConfig, getConfig } from '..'
const mysql = require('mysql2/promise');

export const getAllProductsQuery = /* GraphQL */ `
  query getAllProducts(
    $hasLocale: Boolean = false
    $locale: String = "null"
    $entityIds: [Int!]
    $first: Int = 10
    $products: Boolean = false
    $featuredProducts: Boolean = false
    $bestSellingProducts: Boolean = false
    $newestProducts: Boolean = false
  ) {
    site {
      products(first: $first, entityIds: $entityIds) @include(if: $products) {
        ...productConnnection
      }
      featuredProducts(first: $first) @include(if: $featuredProducts) {
        ...productConnnection
      }
      bestSellingProducts(first: $first) @include(if: $bestSellingProducts) {
        ...productConnnection
      }
      newestProducts(first: $first) @include(if: $newestProducts) {
        ...productConnnection
      }
    }
  }
  ${productConnectionFragment}
`

export type ProductEdge = NonNullable<
  NonNullable<GetAllProductsQuery['site']['products']['edges']>[0]
>

export type ProductNode = ProductEdge['node']

export type GetAllProductsResult<
  T extends Record<keyof GetAllProductsResult, any[]> = {
    products: ProductEdge[]
  }
> = T

const FIELDS = [
  'products',
  'featuredProducts',
  'bestSellingProducts',
  'newestProducts',
]

export type ProductTypes =
  | 'products'
  | 'featuredProducts'
  | 'bestSellingProducts'
  | 'newestProducts'

export type ProductVariables = { field?: ProductTypes } & Omit<
  GetAllProductsQueryVariables,
  ProductTypes | 'hasLocale'
>

async function getAllProducts(opts?: {
  variables?: ProductVariables
  config?: BigcommerceConfig
  preview?: boolean
}): Promise<GetAllProductsResult>

async function getAllProducts<
  T extends Record<keyof GetAllProductsResult, any[]>,
  V = any
>(opts: {
  query: string
  variables?: V
  config?: BigcommerceConfig
  preview?: boolean
}): Promise<GetAllProductsResult<T>>

// TODO : this ec2 is down so this will not work.
const pool = mysql.createPool({
  host            : '18.189.16.137',
  user            : 'root',
  password        : 'readyset',
});

const preparedStatements = {};

async function getAllProducts({
  query = getAllProductsQuery,
  variables: { field = 'products', ...vars } = {},
  config,
}: {
  query?: string
  variables?: ProductVariables
  config?: BigcommerceConfig
  preview?: boolean
} = {}): Promise<GetAllProductsResult> {
    config = getConfig(config);

    console.time("ConnectionInitialization");
    let connection = await pool.getConnection();
    console.timeEnd("ConnectionInitialization");

    console.time("Bruteforce");
    let products = (await connection.query('SELECT products.* FROM products'))[0];
    let entityIds = products.map(x => x['entityId']);

    let imagesProm = Promise.all(entityIds.map(x => connection.execute('SELECT images.* FROM images WHERE images.productEntityId = ?', [x])));
    let variantsProm = Promise.all(entityIds.map(x => connection.execute('SELECT variants.* FROM variants WHERE variants.productEntityId = ?', [x])));
    let productOptionsProm = Promise.all(entityIds.map(x => connection.execute('SELECT productOptions.*, FROM productOptions WHERE productOptions.productEntityId = ?', [x])));
    let productOptionsItemProm = Promise.all(entityIds.map(x => connection.execute('SELECT productOptions.*, productOptionsItem.* FROM productOptions JOIN productOptionsItem ON productOptions.entityId = productOptionsItem.productOptionsEntityId WHERE productOptions.productEntityId = ?', [x])));

    let images = await imagesProm;
    let variants = await variantsProm;
    let productOptions = await productOptionsProm;
    let productOptionsItem = await productOptionsItemProm;
    console.timeEnd("Bruteforce");

    let productsRes = [];

    for (let i in products) {
        let product = products[i];
        let mimages = images[i][0];
        let variant = variants[i][0];
        let options = productOptions[i][0];
        let optionItems = productOptionsItem[i][0];

        let node = {};
        node['entityId'] = product['entityId'];
        node['name'] = product['name'];
        node['path'] = product['path'];
        if (product['brand']) {
            node['brand'] = {'entityId': product['brand']};
        } else {
            node['brand'] = null;
        }
        node['description'] = product['description'];
        node['prices'] = {
            'price': {
                'value': parseFloat(product['price']),
                'currencyCode': 'USD',
            },
            'salePrice': null,
            'retailPrice': null,
        };
        let imageEdges = [];
        for (let image of mimages) {
            imageEdges.push({
                'node': {
                    'urlOriginal': image['urlOriginal'] || null,
                    'altText': '',
                    'isDefault': image['isDefault'] == 1,
                }
            });
        }
        node['images'] = {'edges': imageEdges};

        let variantEdges = [];
        for (let v of variant) {
            let image;
            if (v['defaultImage'] === undefined) {
                image = null;
            } else {
               image = {
                   "urlOriginal": v['defaultImage'],
                   "altText": "",
                   "isDefault": true
               }
            }
            variantEdges.push({
                'node': {
                    'entityId': v['entityId'],
                    'defaultImage': image,
                }
            });
        }
        node['variants'] = {'edges': variantEdges};

        let productOptionsEdges = [];
        for (let op of options) {
            let ops = [];
            for (let opv of optionItems) {
                if (opv.productOptionsEntityId !== op.entityId) {
                    continue;
                }
                let nod = {
                        'label': opv['label'],
                        'isDefault': opv['isDefault'],
                };
                if (opv['hexColors'] !== undefined) {
                    nod['hexColors'] = [opv['hexColors']]
                }
                ops.push({
                    'node': nod
                });
            }

            productOptionsEdges.push({
                'node': {
                    '__typename': 'MultipleChoiceOption',
                    'entityId': op['entityId'],
                    'displayName': op['displayName'],
                    'values': {'edges': ops},
                }
            });
        }
        node['productOptions'] = {'edges': productOptionsEdges};

        productsRes.push({'node': node});
    }

    return {
        products: productsRes,
        featuredProducts: productsRes,
        bestSellingProducts: productsRes,
        newestProducts: productsRes,
    }
}

export default getAllProducts

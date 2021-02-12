CREATE TABLE products (
       entityId INT PRIMARY KEY,
       name VARCHAR(1000),
       path VARCHAR(1000),
       brand INT,
       description VARCHAR(1000),
       price DECIMAL(5, 2),
);

CREATE TABLE images (
       entityId INT PRIMARY KEY,
       productEntityId INT,
       variantEntityId INT,
       urlOriginal VARCHAR(1000),
       isDefault INT,
);

CREATE TABLE variants (
       entityId INT PRIMARY KEY,
       productEntityId INT,
       defaultImage VARCHAR(1000),
);

CREATE TABLE productOptions (
       entityId INT PRIMARY KEY,
       productEntityId INT,
       displayName VARCHAR(1000),
);

CREATE TABLE productOptionsItem (
       entityId INT PRIMARY KEY,
       productOptionsEntityId INT,
       label VARCHAR(1000),
       isDefault INT,
       hexColors VARCHAR(1000),
);

from models import Manufacturer, Product, ProductDetails, Customer

import math
import re
import polars as pl
import os

def create_customers():
    return [
        Customer(
            name="jens bo",
            email="jens@email.com",
            address="jensvej 41, 9999 by, land"
        ),
        Customer(
            name="bob chris",
            email="ogbob@email.com",
            address="street 1, 9999 by, land"
        ),
        Customer(
            name="Heihachi Mishima",
            email="Tekken@ironfist.com",
            address="Tekken tower, 9999 by, land"
        )
    ]


def create_manufacturers_and_products():
    cereals = pl.read_csv("cereal.csv").to_dicts()

    mfrs = {
        "A": "American Home Food Products",
        "G": "General Mills",
        "K": "Kelloggs",
        "N": "Nabisco",
        "P": "Post",
        "Q": "Quaker Oats",
        "R": "Ralston Purina",
    }

    manufacturers: dict[str, Manufacturer] = {}
    for cereal in cereals:
        del cereal["shelf"]

        cereal["price"] = math.ceil(cereal.pop("rating"))
        cereal["stock"] = 10

        

        cereal["name"] = cereal["name"].replace(";", ",")
        # cereal["image"] = re.sub(r"[^a-zA-Z0-9\s\-\_\.]", "_", cereal["name"]) + '.jpg'
        cereal["image"] = os.path.join('static', 'images', re.sub(r"[^a-zA-Z0-9\s\-\_\.]", "_", cereal["name"]) + '.jpg')

        if cereal["mfr"] not in manufacturers:
            manufacturers[cereal["mfr"]] = Manufacturer(name=mfrs[cereal["mfr"]])

        cereal["manufacturer"] = manufacturers[cereal.pop("mfr")]

        cereal["is_hot"] = cereal.pop("type") == "H"

        cereal["carbohydrates"] = cereal.pop("carbo")
        cereal["potassium"] = cereal.pop("potass")

        cereal_keys = ["name", "image", "stock", "price", "manufacturer", "details"]
        details = {}
        for key in [key for key in cereal.keys() if key not in cereal_keys]:
            details[key] = cereal.pop(key)

        details = ProductDetails(**details)

        cereal["details"] = details

    products = [Product(**cereal) for cereal in cereals]

    return list(manufacturers.values()), products


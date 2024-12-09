from models import Manufacturer, Product, Customer

def create_products():
    return [
        Product(
            manufacturer_id=1,
            name="frosties",
            description="corn flakes with sugar",
            image="/images/placeholder.png",
            ingredients="corn, sugar",
            nutritional_value="80g carbohydrates, 15g fat, 5g protein",
            stock=15,
            price=30.0
        ),
        Product(
            manufacturer_id=1,
            name="captain crunch",
            description="corn flakes with sugar",
            image="/images/placeholder.png",
            ingredients="corn, sugar",
            nutritional_value="80g carbohydrates, 15g fat, 5g protein",
            stock=15,
            price=30.0
        ),
        Product(
            manufacturer_id=2,
            name="cini mini",
            description="corn flakes with sugar",
            image="/images/placeholder.png",
            ingredients="corn, sugar",
            nutritional_value="80g carbohydrates, 15g fat, 5g protein",
            stock=15,
            price=30.0
        ),
        Product(
            manufacturer_id=3,
            name="lucky charms",
            description="corn flakes with sugar",
            image="/images/placeholder.png",
            ingredients="corn, sugar",
            nutritional_value="80g carbohydrates, 15g fat, 5g protein",
            stock=15,
            price=30.0
        ),

    ]


def create_manufacturers():
    return [
        Manufacturer(name="Kelogg"),
        Manufacturer(name="Quaker"),
        Manufacturer(name="some other lol")
    ]

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



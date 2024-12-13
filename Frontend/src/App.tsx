import { createSignal, createMemo, onMount, For, JSX, createResource, ErrorBoundary, Show } from 'solid-js'
import { A, action, useParams } from "@solidjs/router";
import './App.css'
import { createStore, unwrap } from 'solid-js/store'

const BACKEND_URL = 'http://127.0.0.1:5000/'

type Manufacturer = {
  id: number

  name: string;

  products?: Product[];
}

type ProductDetails = {
  id: number

  is_hot: boolean;

  weight: number;
  cups: number;

  calories: number;
  protein: number;
  fat: number;
  sodium: number;
  fiber: number;
  carbohydrates: number;
  sugars: number;
  potassium: number;
  vitamins: number;
}

type Product = {
  [key: string]: number | string | Manufacturer | ProductDetails | undefined

  id: number

  name: string
  image: string

  stock: number
  price: number

  manufacturer_id: number
  manufacturer?: Manufacturer

  details_id: number
  details?: ProductDetails
}

type OrderProduct = {
  product_id: number;
  quantity: number;
}

type Order = {
  price: number;
  timestamp: Date;
  customer_id: number;
  address: string;
  status: string;

  order_products: OrderProduct[]
}

function Error(props: { text: string }) {
  return <div id="error">
    <h1>{props.text}</h1>
  </div>
}

function ProductView(props: { products: Product[] }) {
  return <div id="productView">
    <For each={props.products}>{(product) =>
      <ProductContainer product={product}/>
    }</For>
  </div>
}

function ProductContainer(props: { product: Product }) {
  return <A href={"/product/" + props.product.id}>
    <div class="productContainer">
      <div>
        <img src={BACKEND_URL+props.product.image}></img>
      </div>
      <h3>{props.product.name}</h3>
    </div>
  </A>
}

export function MainPage() {
  const [products, setProducts] = createStore<Product[]>([])

  onMount(async () => {
    const res = await fetch(BACKEND_URL+`api/get/product`, {
      method: "POST",
      headers: {"Content-Type": "application/json",},
      body: JSON.stringify({"mappers": ["manufacturer"]})
    });
    if (!res.ok) {
      console.error(await res.text())
      return;
    }
    setProducts(await res.json());
    // console.log(products)
  });

  const headers = createMemo(() => {
    let products_get = products;
    if (products_get.length)
      return Object.keys(products_get[0])
    else
      return []
  })

  const mutate = ({index, key}: {index: number, key: string}) => {
    let value = unwrap(products)[index][key];
    if (typeof value === "number") {
      setProducts(index, key, -value)
    }
    else if (typeof value === "string") {
      if (value.charAt(0) == value.charAt(0).toLowerCase())
        setProducts(index, key, value.toUpperCase())
      else
        setProducts(index, key, value.toLowerCase())
    }
  }

  return (
    <>
      <ProductView products={products}/>
      <div>
        <table>
          <thead>
            <tr>
              <For each={headers()}>{(header) => <th>{header}</th>}</For>
            </tr>
          </thead>
            <tbody>
              <For each={products}>{(product, index) =>
                <tr>
                  <For each={Object.keys(product)}>{(key) =>
                    <td onClick={[mutate, {index: index(), key: key}]}>{product[key]?.toString()}</td>
                  }</For>
                </tr>
              }</For>
            </tbody>
        </table>
        <For each={products}>
          {(product) => {
            return <img src={BACKEND_URL+product.image?.toString()} style="max-width: 100px; max-height: 200px; width: auto; height: auto;"></img>
          }}
        </For>
      </div>
    </>
  )
}

async function fetchProduct(id: number): Promise<Product> {
  console.log('fetch');
  console.log(BACKEND_URL+`api/get/product/`+id);
  const res = await fetch(BACKEND_URL+`api/get/product/`+id, {
    method: "POST",
    headers: {"Content-Type": "application/json",},
    body: JSON.stringify({"mappers": ["details", "manufacturer", "manufacturer.products"]})
  })
  if (!res.ok) {
    throw "failed to fetch product";
  }

  return await res.json()
}

function ProductPerServing(props: { details: ProductDetails }) {
  const { details } = props;

  return <table>
    <thead>
      <tr>
        <th>Weight</th>
        <th>Amount</th>

        <th>Calories</th>
        <th>Protein</th>
        <th>Fat</th>
        <th>Sodium</th>
        <th>Fiber</th>
        <th>Carbohydrates</th>
        <th>Sugars</th>
        <th>Potassium</th>
        <th>Vitamins</th>
      </tr>
    </thead>
      <tbody>
        <tr>
          <td>{details.weight} oz</td>
          <td>{details.cups} cups</td>

          <td>{details.calories} kcal</td>
          <td>{details.protein} g</td>
          <td>{details.fat} g</td>
          <td>{details.sodium} mg</td>
          <td>{details.fiber} g</td>
          <td>{details.carbohydrates} g</td>
          <td>{details.sugars} g</td>
          <td>{details.potassium} mg</td>
          <td>{details.vitamins} %</td>
        </tr>
      </tbody>
  </table>
}

function Product(props: { product: Product }) {
  const { product } = props;

  const buy = action(async (data) => {
    const order: Order = {
      price: 100.0,
      timestamp: new Date(),
      customer_id: 1,
      address: "Et sted",
      status: "Købt",

      order_products: [{
        product_id: product.id,
        quantity: 1,
      }]
    }

    const res = await fetch(BACKEND_URL+`api/order`, {
      method: "POST",
      headers: {"Content-Type": "application/json",},
      body: JSON.stringify(order)
    })
  })

  const other_products = () => {
    return product.manufacturer!.products!.filter((p) => p.id != product.id)
  }

  return <div id="product">
    <img src={BACKEND_URL+product.image} />
    <h1>{product.name}</h1>
    <form action={buy} method="post">
      <button type="submit">Buy</button>
    </form>
    <h2>In a serving</h2>
    <ProductPerServing details={product.details!}/>
    <h2>Other products by {product.manufacturer!.name}</h2>
    <ProductView products={other_products()}/>
  </div>
}

export function ProductPage() {
  const params = useParams();

  const [product] = createResource(() => Number(params.id), fetchProduct);

  return <ErrorBoundary fallback={(_err) => <Error text="Unable to load product information"/>}>
    <Show when={product()}>
      <Product product={product()!}/>
    </Show>
  </ErrorBoundary>
}

export function Page404() {
  return <>
    <h1>404</h1>
  </>
}

import { createSignal, createMemo, onMount, For, JSX, createResource, ErrorBoundary, Show, createEffect, Resource } from 'solid-js'
import { A, action, useParams } from "@solidjs/router";
import './App.css'
import { createStore, unwrap } from 'solid-js/store'
import { jwtDecode }  from 'jwt-decode';
import { cart, setCart, setUser, user } from './index.tsx'

export const BACKEND_URL = 'http://127.0.0.1:5000/'

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

  return (
    <>
      <ProductView products={products}/>
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

function ProductPerServing(props: { product: () => Product }) {
  const { product } = props;
  const details = () => product()?.details!

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
          <td>{details().weight} oz</td>
          <td>{details().cups} cups</td>

          <td>{details().calories} kcal</td>
          <td>{details().protein} g</td>
          <td>{details().fat} g</td>
          <td>{details().sodium} mg</td>
          <td>{details().fiber} g</td>
          <td>{details().carbohydrates} g</td>
          <td>{details().sugars} g</td>
          <td>{details().potassium} mg</td>
          <td>{details().vitamins} %</td>
        </tr>
      </tbody>
  </table>
}

function Product(props: { product: Resource<Product> }) {
  const product = () => props.product()!;

  const buy = action(async (data) => {
    const order: Order = {
      price: product().price,
      timestamp: new Date(),
      customer_id: 1,
      address: "Et sted",
      status: "Købt",

      order_products: [{
        product_id: product().id,
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
    return product().manufacturer!.products!.filter((p) => p.id != product().id)
  }

  return <div id="product">
    <img src={BACKEND_URL+product().image} />
    <h1>{product().name}</h1>
    <form action={buy} method="post">
      <button type="submit">Buy</button>
    </form>
    <h2>In a serving</h2>
    <ProductPerServing product={product}/>
    <h2>Other products by {product().manufacturer!.name}</h2>
    <ProductView products={other_products()}/>
  </div>
}

export function ProductPage() {
  const params = useParams();

  const [product] = createResource(() => Number(params.id), fetchProduct);

  createEffect(() => {
    console.log(product());
  });

  return <ErrorBoundary fallback={(_err) => <Error text="Unable to load product information"/>}>
    <Show when={product()}>
      <Product product={product}/>
    </Show>
  </ErrorBoundary>
}

export function LoginPage() {
  const [error, setError] = createSignal<string | undefined>(undefined);

  const access = async (endpoint: string, data: URLSearchParams) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(Object.fromEntries(data)),
      credentials: "include",
    });

    if (res.ok) {
      setUser({email: data.get("email")!})
    }
    else {
      setError(await res.text());
    }
  }

  const login = action(async (data) => {
    await access(BACKEND_URL+`api/login`, data);
  });

  const signup = action(async (data) => {
    await access(BACKEND_URL+`api/user`, data);
  });

  const test = action(async (data) => {
    const res = await fetch(BACKEND_URL+`api/delete/product/1`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(Object.fromEntries(data)),
      credentials: "include",
    });
  });;

  return <>
    <form action={login} method="post" >
      <input name="email" type="email" required></input>
      <input name="password" type="password" required></input>
      <button type="submit" formaction={login}>Login</button>
      <button type="submit" formaction={signup}>Signup</button>
      <button type="submit" formaction={test}>Test</button>
    </form>
    <Show when={error()}>
      <p>{error()!}</p>
    </Show>
  </>
}

export function Page404() {
  return <>
    <h1>404</h1>
  </>
}

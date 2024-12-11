import { createSignal, createMemo, onMount, For } from 'solid-js'
import './App.css'
import { createStore, unwrap } from 'solid-js/store'

const BACKEND_URL = 'http://127.0.0.1:5000/'

type Manufacturer = {
  id: number

  name: string;
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

type Record = {
  [index: string]: null | boolean | number | string
}

function Header() {
  return <div id="header">
    <img id="logo" src="logo.png"></img>
    <h2 id="name">Cereal</h2>
  </div>
}

function ProductView(props) {
  return <div id="productView">
    <For each={props.products}>{(product) =>
      <ProductContainer product={product}/>
    }</For>
  </div>
}

function ProductContainer(props) {
  return <div class="productContainer">
    <img src={BACKEND_URL+props.product.image}></img>
    <h3 id="product_title">{props.product.name}</h3>
  </div>
}

function App() {
  const [products, setProducts] = createStore<Product[]>([])

  onMount(async () => {
    const res = await fetch(BACKEND_URL+`api/get/product`, {
      method: "POST",
      headers: {"Content-Type": "application/json",},
      body: JSON.stringify({"mappers": ["manufacturer", "details"]})
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
      <Header/>
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

export default App

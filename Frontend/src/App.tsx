import { createSignal, createMemo, onMount, For } from 'solid-js'
import './App.css'

// function ItemTable() {

// }
type Product = {
  id: number;
  name: string;
  description: string;
  image: string;
  ingredients: string;
  nutritional_value: string;
  price: number;
  stock: number;
}

function App() {
  const [products, setProducts] = createSignal<Product[]>([])

  onMount(async () => {
    const res = await fetch(`http://127.0.0.1:5000/api/get/product`, {
      method: "POST",
      headers: {"Content-Type": "application/json",},
      body: JSON.stringify({})
    });
    if (!res.ok) {
      console.error(await res.text())
      return;
    }
    setProducts(await res.json());
    // console.log(products)
  });

  const headers = createMemo(() => {
    let products_get = products();
    if (products_get.length)
      return Object.keys(products_get[0])
    else
      return []
  })



  return (
    <>
      <div>
        <table>
          <thead>
            <tr>
              <For each={headers()}>{(header) => <th>{header}</th>}</For>
            </tr>
          </thead>
            <tbody>
              <For each={products()}>{(product) => {
                return <tr>{Object.values(product).map((value) => <td>{value}</td> )}</tr>
              }}</For>
            </tbody>
        </table>
      </div>
    </>
  )
}

export default App

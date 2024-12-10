import { createSignal, createMemo, onMount, For } from 'solid-js'
import './App.css'

type Record = {
  [index: string]: boolean | number | string | null
}

function App() {
  const [products, setProducts] = createSignal<Record[]>([])

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
                return <tr>{Object.values(product).map((value) => <td>{value?.toString()}</td> )}</tr>
              }}</For>
            </tbody>
        </table>
        <For each={products()}>
          {(product) => {
            return <img src={"product/" + product.image?.toString()} style="max-width: 100px; max-height: 200px; width: auto; height: auto;"></img>
          }}
        </For>
      </div>
    </>
  )
}

export default App

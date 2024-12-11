import { createSignal, createMemo, onMount, For } from 'solid-js'
import './App.css'
import { createStore, unwrap } from 'solid-js/store'

type Record = {
  [index: string]: null | boolean | number | string
}

function App() {
  const [products, setProducts] = createStore<Record[]>([])

  const backend_url = 'http://127.0.0.1:5000/'

  onMount(async () => {
    const res = await fetch(backend_url+`api/get/product`, {
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
    switch (typeof(value)) {
      case 'boolean':
        setProducts(index, key, !value)
        break;
      case 'number':
        break;
      case 'string':
        break;
    }
  }

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
            return <img src={backend_url+product.image?.toString()} style="max-width: 100px; max-height: 200px; width: auto; height: auto;"></img>
          }}
        </For>
      </div>
    </>
  )
}

export default App

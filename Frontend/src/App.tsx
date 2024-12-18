import { createSignal, onMount, For, createResource, ErrorBoundary, Show, createEffect, Resource } from 'solid-js'
import { A, action, redirect, useParams, useNavigate } from "@solidjs/router";
import './App.css'
import { createStore } from 'solid-js/store'
import { cart, CartProduct, setCart, setUser, user, UserStorage, } from './index.tsx'

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
  price?: number;
  timestamp?: Date;
  email: string;
  name: string;
  address: string;
  status?: string;

  order_products: OrderProduct[]
}

type User = {
  email?: string;
  name?: string;
  address?: string;

  orders: Order[];
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

  const [quantity, setQuantity] = createSignal(1);

  createEffect(() => {
    product();
    setQuantity(1);
  });

  const addToCart = () => {
    if (cart.find((item) => item.id == product().id))
      setCart((item) => item.id == product().id, "quantity", (prev) => prev + quantity());
    else
      setCart(cart.length, {id: product().id, quantity: quantity()});
    setQuantity(1);
  }

  const other_products = () => {
    return product().manufacturer!.products!.filter((p) => p.id != product().id);
  }

  const navigate = useNavigate();

  const delete_product = async () => {
    const res = await fetch(BACKEND_URL+`api/delete/product/`+product().id, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      navigate("/", { scroll: true });
    }
  };

  return <div id="product">
    <img src={BACKEND_URL+product().image} />
    <h1>{product().name}</h1>
    <h3><b>{product().price}</b> Monopoly money</h3>
    <button on:click={addToCart}>Add to cart</button>
    <input id="quantity_counter" type="number" min="1" value={quantity()} on:input={(ev) => {setQuantity(Math.max(Number(ev.target.value), 1))}}></input>
    {/* <Show when={user()?.admin}> */}
      <button on:click={delete_product}>Delete</button>
    {/* </Show> */}
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

    if (!res.ok) {
      setError(await res.text());
      return;
    }

    const res_user = await fetch(BACKEND_URL+`api/user/info`, {
      method: "GET",
      credentials: "include",
    });

    if (res_user.ok) {
      setUser(await res_user.json());
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

  return <>
    <form action={login} method="post" >
      <h3>Login / Sign up</h3>
      <input placeholder="E-mail" name="email" type="email" required></input>
      <input placeholder="Password" name="password" type="password" required></input>
      <button type="submit" formaction={login}>Login</button>
      <button type="submit" formaction={signup}>Signup</button>
    </form>
    <Show when={error()}>
      <p>{error()!}</p>
    </Show>
  </>
}

function CartContainer(props: { remove: () => void, item: CartProduct, product: Product }) {
  return <div class="cartContainer">
      <A href={"/product/" + props.product.id}>
        <div class="cartColumn productContainer">
          <h3>{props.product.name}</h3>
          <div>
            <img src={BACKEND_URL+props.product.image}></img>
          </div>
        </div>
      </A>
      <div class="cartColumn">
        <p>Quantity: {props.item.quantity}</p>
        <button on:click={props.remove}>Remove</button>
      </div>
    </div>
}

export function CartPage() {
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
  });

  const removeFromCart = (id: number) => {
    return () => {
      setCart(cart.filter((item) => item.id != id));
    };
  };

  const sumPrice = () => {
    return cart
      .map((item) => {
        const product = products.find((product) => product.id == item.id);
        return item.quantity * product!.price;
      })
      .reduce((total, price) => total + price, 0);
  };

  return <>
    <Show when={products.length != 0}>
      <h3><b>{sumPrice()}</b> Monopoly money</h3>
      <For each={cart}>{(item) =>
        <CartContainer remove={removeFromCart(item.id)} item={item} product={products.find((product) => product.id == item.id)!}/>
      }</For>
    </Show>
  </>
}

export function CheckoutPage() {
  const [user_info] = createResource<User | undefined, UserStorage | undefined>(() => user(), async () => {
    const res = await fetch(BACKEND_URL+`api/user/info`, {
      method: "GET",
      credentials: "include",
    });

    if (res.ok) {
      return await res.json()
    }
    else {
      return undefined;
    }
  });

  let email;
  let name;
  let address;

  createEffect(() => {
    const info = user_info();
    if (info) {
      email!.value = info.email;
      name!.value = info.name;
      address!.value = info.address;
    }
  });

  const [error, setError] = createSignal<string | undefined>(undefined);

  const buy = action(async (data) => {
    setError(undefined);

    const {email, name, address} = Object.fromEntries(data);

    const order: Order = {
      email: email,
      name: name,
      address: address,

      order_products: cart.map((item) => {
        return {
          product_id: item.id,
          quantity: item.quantity,
        }
      })
    };

    const res = await fetch(BACKEND_URL+`api/order`, {
      method: "POST",
      headers: {"Content-Type": "application/json",},
      body: JSON.stringify(order),
      credentials: "include",
    });

    if (res.ok) {
      setCart([]);
    }
    else {
      setError(await res.text());
    }
  })

  return <>
    <form action={buy} method="post">
      <input name="email" class="checkoutfield" placeholder="E-mail" type="email" required ref={email}/>
      <input name="name" class="checkoutfield" placeholder="Name" required ref={name}/>
      <input name="address" class="checkoutfield" placeholder="Address" required ref={address}/>
      <button type="submit" formaction={buy}>Buy</button>
    </form>
    <Show when={error()}>
      <p>{error()!}</p>
    </Show>
    <CartPage/>
  </>
}

export function UserPage() {
  const [user_info] = createResource<User | undefined, UserStorage | string>(() => { return user() || "" }, async (user) => {
    if (typeof(user) === "string")
      return undefined;

    const res = await fetch(BACKEND_URL+`api/user/info`, {
      method: "GET",
      credentials: "include",
    });

    if (res.ok) {
      return await res.json()
    }
    else {
      return undefined;
    }
  });

  let email;
  let name;
  let address;

  createEffect(() => {
    const info = user_info();
    if (info) {
      email!.value = info.email;
      name!.value = info.name;
      address!.value = info.address;
    }
  });

  const [error, setError] = createSignal<string | undefined>(undefined);

  const save = action(async (data) => {
    setError(undefined);

    const res = await fetch(BACKEND_URL+`api/user/info`, {
      method: "POST",
      headers: {"Content-Type": "application/json",},
      body: JSON.stringify(Object.fromEntries(data)),
      credentials: "include",
    });

    if (!res.ok) {
      setError(await res.text());
    }
  })

  return <Show when={() => user_info.loading} fallback={<Error text="Loading..."/>}>
    <Show when={user_info()} fallback={<Error text="Not logged in"/>}>
      <form action={save} method="post">
        <input name="email" class="checkoutfield" placeholder="E-mail" type="email" required ref={email}/>
        <input name="name" class="checkoutfield" placeholder="Name" required ref={name}/>
        <input name="address" class="checkoutfield" placeholder="Address" required ref={address}/>
        <button type="submit" formaction={save}>Save</button>
      </form>
      <Show when={error()}>
        <p>{error()!}</p>
      </Show>
      <For each={user_info()!.orders}>{(order) =>
        <p>
          Bought {order.order_products.map((product) => product.quantity).reduce((acc, quantity) => acc + quantity, 0)} items for {order.price!} Monopoly money at {order.timestamp!.toString()}
        </p>
      }</For>
    </Show>
  </Show>
}

export function Page404() {
  return <>
    <h1>404</h1>
  </>
}

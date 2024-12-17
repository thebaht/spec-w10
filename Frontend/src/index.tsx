/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route, A, RouteSectionProps } from "@solidjs/router";
import { createSignal, JSX, onMount, Show } from 'solid-js'
import './index.css'
import { Page404, MainPage, ProductPage, LoginPage, BACKEND_URL } from './App.tsx'
import { makePersisted } from '@solid-primitives/storage';
import { createStore } from 'solid-js/store';

const root = document.getElementById('root')

function FloatingBox(props: { onClose: () => any, children: JSX.Element }) {
  return (
    <div class="overlay" onClick={props.onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        {props.children}
        <button onClick={props.onClose}>Close</button>
      </div>
    </div>
  );
}

function Header() {
  const [isBoxOpen, setIsBoxOpen] = createSignal(false);

  const openBox = () => setIsBoxOpen(true);
  const closeBox = () => setIsBoxOpen(false);
  return <div id="header">
    <A id="home" href={"/"}>
      <img id="logo" src="/logo.png"></img>
      <h2 id="name">Cereal</h2>
    </A>

    <button onClick={openBox}>create product</button>
    <Show when={isBoxOpen()}>
    <FloatingBox onClose={closeBox}>
      <h2>Create Product</h2>
      <input type="text" placeholder="Type something..." />
    </FloatingBox>
    </Show>
    <A href={"/login"}>Login</A>
  </div>
}

const Layout = (props: RouteSectionProps) => {
  return (
      <>
          <Header/>
          {props.children}
      </>
  );
};

type CartProduct = {
  id: number;
  quantity: number;
}

type User = {
  email: string;
}

export const [cart, setCart, initCart] = makePersisted(createStore<CartProduct[]>([]), {name: "cart"});
export const [user, setUser, initUser] = makePersisted(createSignal<User | undefined>({email: ""}), {name: "user"});

render(
  () => {
    onMount(async () => {
      const res = await fetch(BACKEND_URL+`api/user/email`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setUser({email: await res.text()});
      }
      else {
        setUser(undefined)
      }
    });

    return <>
      <Router root={Layout}>
        <Route path="/" component={MainPage} />
        <Route path="/product/:id" component={ProductPage} matchFilters={{id: /^\d+$/}} />
        <Route path="/login" component={LoginPage} />
        <Route path="*" component={Page404} />
      </Router>
    </>
  },
  root!
)

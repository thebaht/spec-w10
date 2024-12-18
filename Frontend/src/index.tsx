/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route, A, RouteSectionProps, action } from "@solidjs/router";
import { createEffect, createSignal, JSX, onMount, Show } from 'solid-js'
import './index.css'
import { Page404, MainPage, ProductPage, LoginPage, BACKEND_URL, CartPage, CheckoutPage, UserPage } from './App.tsx'
import { makePersisted } from '@solid-primitives/storage';
import { createStore } from 'solid-js/store';

const root = document.getElementById('root')

function FloatingBox(props: { onClose: () => any, children: JSX.Element, width?: string }) {
  return (
    <div class="overlay" onClick={props.onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ "max-width": props.width || '400px' }}>
        {props.children}
        <button onClick={props.onClose}>Close</button>
      </div>
    </div>
  );
}

function Header() {
  const logout = async () => {
    const res = await fetch(BACKEND_URL+`api/logout`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      setUser(undefined);
    }
  }


  const [isLoginOpen, setIsLoginOpen] = createSignal(false);
  const openLogin = () => setIsLoginOpen(true);
  const closeLogin = () => setIsLoginOpen(false);

  const [isCartOpen, setIsCartOpen] = createSignal(false);
  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  createEffect(() => {
    if (user()) {
      setIsLoginOpen(false);
    }
  });

  const loginEl = () => {
    if (user()) {
      return <>
        <button on:click={logout}>Logout</button>
        <A href="/user">{user()!.email}</A>
      </>
    }
    else {
      return <>
        <button on:click={openLogin}>Login</button>
        <Show when={isLoginOpen()}>
          <FloatingBox onClose={closeLogin}>
            <LoginPage/>
          </FloatingBox>
        </Show>
      </>
    }
  }

  return <div id="header">
    <A id="home" href={"/"}>
      <img id="logo" src="/logo.png"></img>
      <h2 id="name">Cereal</h2>
    </A>

    {loginEl()}
    <button on:click={openCart}>Cart</button>
    <Show when={isCartOpen()}>
      <FloatingBox onClose={closeCart} width='600px'>
        <A href="/checkout"><button on:click={closeCart}>Checkout</button></A>
        <CartPage/>
      </FloatingBox>
    </Show>
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

export type CartProduct = {
  id: number;
  quantity: number;
}

export type UserStorage = {
  email: string;
  admin: boolean;
}

export const [cart, setCart, initCart] = makePersisted(createStore<CartProduct[]>([]), {name: "cart"});
export const [user, setUser] = createSignal<UserStorage | undefined>(undefined);

render(
  () => {
    onMount(async () => {
      const res = await fetch(BACKEND_URL+`api/user/info`, {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) {
        setUser(await res.json());
      }
      else {
        setUser(undefined);
      }
    });

    return <>
      <Router root={Layout}>
        <Route path="/" component={MainPage} />
        <Route path="/product/:id" component={ProductPage} matchFilters={{id: /^\d+$/}} />
        <Route path="/checkout" component={CheckoutPage} />
        <Route path="/user" component={UserPage} />
        <Route path="*" component={Page404} />
      </Router>
    </>
  },
  root!
)

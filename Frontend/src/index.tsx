/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from "@solidjs/router";
import './index.css'
import { App, Product } from './App.tsx'

const root = document.getElementById('root')

render(() => (
        <Router>
            <Route path="/" component={App} />
            <Route path="/product/:id" component={Product} />
        </Router>
    ),
    root!
)

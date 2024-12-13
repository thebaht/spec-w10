/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from "@solidjs/router";
import './index.css'
import { Page404, App, Product } from './App.tsx'

const root = document.getElementById('root')

render(() => (
        <Router>
            <Route path="/" component={App} />
            <Route path="/product/:id" component={Product} matchFilters={{id: /^\d+$/}} />
            <Route path="*" component={Page404} />
        </Router>
    ),
    root!
)

import { createRouter, createWebHistory } from "vue-router"

const routes = [
  {
    path: "/",
    component: { template: "<main></main>" },
  },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})

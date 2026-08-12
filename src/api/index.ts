import axios from 'axios'
import type { ApiResponse } from './types/device'

const request = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  timeout: 10000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('mp_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResponse<unknown>
    if (res.code !== 0) {
      return Promise.reject(new Error(res.message || 'Request Error'))
    }
    return response
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default request

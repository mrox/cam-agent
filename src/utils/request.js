import Axios from 'axios';
import config from '../config';
// import {
//   API_URL
// } from './constants';
export var axios = Axios.create({
  baseURL: config.api,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
});

export const get = (url) =>
  axios.get(url)
    .then(checkStatus)
    .catch(error => {
      throw error;
    });

export const post = (url, data) =>
  axios.post(url, data).then(checkStatus)
    .catch(error => {
      throw error;
    });

export const put = (url, data) =>
  axios.put(url, data).then(checkStatus)
    .catch(error => {
      throw error;
    });

export const del = (url) =>
  axios.delete(url)
    .then(checkStatus)
    .catch(error => {
      throw error;
    });


export const addHeader = (key, value) => {
  axios.defaults.headers.common[key] = value;
}

/**
 * Checks if a network request came back fine, and throws an error if not
 *
 * @param  {object} response   A response from a network request
 *
 * @return {object|undefined} Returns either the response, or throws an error
 */
export function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response.data;
  }

  const error = new Error(response.statusText);
  error.response = response;
  throw error;
}

export default axios;
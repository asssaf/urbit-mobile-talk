import { AsyncStorage } from 'react-native';

export function loadState(map) {
  promises = []
  Object.keys(map).forEach(key => {
    promises.push(AsyncStorage.getItem('@urbit-mobile-talk:' + key)
      .then(v => this.setState({ [key]: JSON.parse(v) || map[key] })))
  })
  return Promise.all(promises)
}

export async function saveState(key, value) {
  try {
    await AsyncStorage.setItem('@urbit-mobile-talk:' + key, JSON.stringify(value));
  } catch (error) {
    console.log(error)
  }
}

export function updateLru(items, newItem, limit = 5) {
  var updated = [ newItem ]
  updated.push(...items.filter(i => i != newItem))

  if (updated.length > limit) {
    updated = updated.slice(0, limit)
  }

  return updated
}

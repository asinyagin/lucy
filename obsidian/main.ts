import { Plugin } from 'obsidian';

export default class LucyPlugin extends Plugin {
  async onload() {
    console.log('Loading Lucy plugin');
  }

  onunload() {
    console.log('Unloading Lucy plugin');
  }
}

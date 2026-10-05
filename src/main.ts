import './styles.css';
import { App } from './core/App';

const container = document.getElementById('app');
const uiRoot = document.getElementById('ui');
if (!container || !uiRoot) throw new Error('Missing #app or #ui container');

new App(container, uiRoot).start();

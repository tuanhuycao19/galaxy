import './styles.css';
import { App } from './core/App';
import { LoadingScreen } from './ui/LoadingScreen';

const container = document.getElementById('app');
const uiRoot = document.getElementById('ui');
if (!container || !uiRoot) throw new Error('Missing #app or #ui container');

const loading = new LoadingScreen(() => loading.finish());

try {
  new App(container, uiRoot, loading).start();
} catch (error) {
  console.error(error);
  loading.fail(
    'Không khởi tạo được đồ hoạ 3D. Trình duyệt hoặc thiết bị của bạn có thể không hỗ trợ WebGL 2 — hãy thử Chrome, Edge, Firefox hoặc Safari bản mới.',
  );
}

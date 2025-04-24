import { observer } from 'mobx-react-lite';
import {Table} from './components/Table';

export const App = observer(() => {
  return (
    <div>
      <Table />
    </div>
  );
});

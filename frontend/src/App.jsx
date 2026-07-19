import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './Landing';
import Demo from './Demo';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/demo" element={<Demo />} />
      </Routes>
    </BrowserRouter>
  );
}

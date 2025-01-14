import React from "react";
import VirtualGuide from "./components/VirtualGuide";
import "./App.css";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Travel Guide AI</h1>
      </header>
      <main>
        <VirtualGuide />
      </main>
    </div>
  );
}

export default App;

// 메인 App 컴포넌트
// 라우팅과 전체 앱 구조를 정의하세요

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import StatsPage from './pages/StatsPage';
import './App.css';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';
import { AppProviders } from './context/AppProviders'; // Meta Provider


function App() {
  return (
    <div>
      <header>
        <SignedOut>
          <SignInButton />
          <SignUpButton />
          <p>Sign in to use the app</p>
        </SignedOut>
        <SignedIn>
          <BrowserRouter>
            <AppProviders>
              <div className="user-button-container">
                <UserButton />
              </div>

              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/stats" element={<StatsPage />} />
              </Routes>
            </AppProviders>
          </BrowserRouter>
        </SignedIn>
      </header>
    </div>
  );
}

export default App;
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.tsx';
import { LoaderProvider } from './contexts/LoaderContext.tsx';
import { ThemeProvider } from './contexts/ThemeProvider.tsx';
import "./i18n/i18n";
createRoot(document.getElementById("root")!).render(
    <ThemeProvider>
    <LoaderProvider>
        <AuthProvider>
            <App />
        </AuthProvider>
    </LoaderProvider>
    </ThemeProvider>
);

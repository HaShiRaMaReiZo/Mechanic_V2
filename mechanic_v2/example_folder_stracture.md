my-app/
└── src/
    ├── app/           # Expo Router screens, layouts, and navigation
    │   ├── _layout.tsx    # Root layout (wraps providers and top navigator)
    │   ├── index.tsx      # Home screen (e.g. Dashboard)
    │   ├── settings.tsx   # Another top-level screen
    │   ├── users/         # Feature folder (nested routes)
    │   │   ├── index.tsx  # e.g. /users list screen
    │   │   └── [id].tsx   # e.g. /users/123 detail screen
    │   └── +not-found.tsx # Unmatched route (404) screen:contentReference[oaicite:0]{index=0}
    ├── common/        # Shared UI components & hooks
    │   ├── components/   # Reusable presentational components (Buttons, Cards, etc.):contentReference[oaicite:1]{index=1}
    │   └── hooks/        # Custom hooks (e.g. useAuth, useTheme):contentReference[oaicite:2]{index=2}
    ├── features/      # Redux “feature” modules (state, actions, thunks)
    │   ├── auth/         # e.g. Authentication feature
    │   │   ├── authSlice.ts   # Redux slice (state + reducers):contentReference[oaicite:3]{index=3}
    │   │   └── ... (Auth-specific UI/hooks)
    │   └── tickets/      # Another feature (e.g. Maintenance Tickets)
    │       ├── ticketsSlice.ts
    │       └── ...
    ├── store/         # Redux store setup
    │   └── configureStore.ts   # Creates store, combines reducers:contentReference[oaicite:4]{index=4}
    ├── constants/     # App-wide constants (colors, fonts, etc.)
    ├── utils/         # General utility functions (API helpers, formatters)
    └── assets/        # Static assets (images, fonts, etc.)

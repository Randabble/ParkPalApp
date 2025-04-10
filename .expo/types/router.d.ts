/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)/login` | `/(auth)/register` | `/(auth)/role-selection` | `/(driver)/home` | `/(host)/home` | `/_sitemap` | `/home` | `/login` | `/register` | `/role-selection`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}

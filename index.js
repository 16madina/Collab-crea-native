// Point d'entrée : `@expo/metro-runtime` doit rester le premier import (Fast Refresh web).
import "@expo/metro-runtime";
import { renderRootComponent } from "expo-router/build/renderRootComponent";
import Boot from "./src/Boot";

renderRootComponent(Boot);

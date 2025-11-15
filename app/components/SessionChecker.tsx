// components/SessionChecker.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../database/db";
import { TRIAL_CREDENTIALS, USERS } from "../lib/constants/constants";
import { useAuth } from "../context/AuthContext";

const SessionChecker = () => {
  const router = useRouter();
  const { logoutUser, user } = useAuth();

  useEffect(() => {
    const checkSession = async () => {
      console.log("🔍 SessionChecker ejecutándose...");

      const auth = await db.auth.get(1);
      if (!auth?.isAuthenticated || !auth.userId) {
        console.log("ℹ️ No hay usuario autenticado");
        return;
      }

      const user = await db.users.get(auth.userId);
      if (!user) {
        console.log("❌ Usuario no encontrado en la base de datos");
        return;
      }

      const now = new Date();
      console.log(`👤 Usuario actual: ${user.username} (ID: ${auth.userId})`);

      // Verificar si el usuario está activo
      const userConfig = USERS.find((u) => u.id === auth.userId);
      console.log(`🔍 Configuración del usuario:`, userConfig);

      if (userConfig && userConfig.isActive === false) {
        console.log(
          `🚫 Usuario ${user.username} está inactivo, cerrando sesión...`
        );

        // Limpiar completamente la sesión
        await db.auth.put({
          id: 1,
          isAuthenticated: false,
          userId: undefined,
        });

        // Forzar recarga para limpiar cualquier estado en memoria
        router.push("/login?inactive=true");
        return;
      }

      // Resto del código para trial...
      if (user.username === TRIAL_CREDENTIALS.username) {
        console.log("🔍 Verificando periodo de prueba...");
        const trialRecord = await db.trialPeriods
          .where("userId")
          .equals(auth.userId)
          .first();

        if (trialRecord) {
          const firstAccess = new Date(trialRecord.firstAccessDate);
          if (!isNaN(firstAccess.getTime())) {
            const diffInMs = now.getTime() - firstAccess.getTime();
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
            console.log(
              `📅 Días transcurridos de trial: ${diffInDays.toFixed(2)}`
            );

            if (diffInDays > 7) {
              console.log("⏰ Trial expirado, cerrando sesión...");
              await db.users.delete(user.id);
              await db.auth.put({
                id: 1,
                isAuthenticated: false,
                userId: undefined,
              });
              router.push("/login?expired=true");
              return;
            }
          }
        } else {
          console.log("📝 Creando registro de trial...");
          await db.trialPeriods.put({
            userId: auth.userId,
            firstAccessDate: now,
          });
        }
      }

      await db.appState.put({ id: 1, lastActiveDate: now });
      console.log("✅ SessionChecker completado");
    };

    checkSession();

    // 30 segundos para testing
    const interval = setInterval(checkSession, 30000);

    console.log("🔄 SessionChecker iniciado - verificando cada 30 segundos");

    return () => {
      console.log("🛑 SessionChecker detenido");
      clearInterval(interval);
    };
  }, [router, logoutUser, user]);

  return null;
};

export default SessionChecker;

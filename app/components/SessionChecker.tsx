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

      const userConfig = USERS.find((u) => u.id === auth.userId);

      if (userConfig && userConfig.isActive === false) {
        // Limpiar completamente la sesión
        await db.auth.put({
          id: 1,
          isAuthenticated: false,
          userId: undefined,
        });

        return;
      }

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

    // 1 hora
    const interval = setInterval(checkSession, 360000);

    return () => {
      console.log("🛑 SessionChecker detenido");
      clearInterval(interval);
    };
  }, [router, logoutUser, user]);

  return null;
};

export default SessionChecker;

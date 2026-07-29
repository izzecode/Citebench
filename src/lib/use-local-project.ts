"use client";

import { useEffect, useState } from "react";
import {
  findProject,
  upsertProject,
  type Project,
} from "@/lib/citebench";
import {
  loadHostedProject,
  persistHostedProject,
} from "@/lib/supabase/projects";

export function useLocalProject(projectId: string) {
  const [project, setProjectState] = useState<Project | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [storageMode, setStorageMode] = useState<"local" | "hosted">("local");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      try {
        const hostedProject = await loadHostedProject(projectId);
        if (cancelled) {
          return;
        }

        if (hostedProject === null) {
          setProjectState(findProject(projectId));
          setStorageMode("local");
        } else {
          setProjectState(hostedProject);
          setStorageMode("hosted");
        }
      } catch (error) {
        if (!cancelled) {
          setSaveError(
            error instanceof Error ? error.message : "The project could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void loadProject();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function setProject(nextProject: Project) {
    const previousProject = project;
    setProjectState(nextProject);
    setSaveError("");

    if (storageMode === "hosted") {
      try {
        await persistHostedProject(nextProject, previousProject);
        return true;
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Changes could not be saved.",
        );
        return false;
      }
    }

    upsertProject(nextProject);
    return true;
  }

  return { project, setProject, loaded, storageMode, saveError };
}

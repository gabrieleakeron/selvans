"""
Demo backend — task management app powered by selvans-python.

Services registered with selvans-core:
  projects  list · get · create
  tasks     list · get · create · update · complete · delete
  stats     summary

Run:
  Selvans_CORE_URL=http://localhost:8080 uvicorn main:app --reload --port 8001
"""
import os
import uuid
from datetime import datetime

import uvicorn
from selvans import SelvansBeApp, SelvansBeConfig, SelvansService, operation


# ── In-memory store ───────────────────────────────────────────────────────────

_projects: dict[str, dict] = {}
_tasks: dict[str, dict] = {}


# ── Services ──────────────────────────────────────────────────────────────────

class ProjectService(SelvansService):
    name = "projects"
    description = "Project management — create and retrieve projects"

    @operation("list", description="List all projects")
    async def list_projects(self) -> list:
        return list(_projects.values())

    @operation("get", description="Get a project by ID")
    async def get_project(self, project_id: str) -> dict:
        project = _projects.get(project_id)
        if not project:
            raise ValueError(f"Project '{project_id}' not found")
        return project

    @operation("create", description="Create a new project with name and optional description")
    async def create_project(self, name: str, description: str = "") -> dict:
        project = {
            "id": str(uuid.uuid4())[:8],
            "name": name,
            "description": description,
            "created_at": datetime.utcnow().isoformat(),
        }
        _projects[project["id"]] = project
        return project


class TaskService(SelvansService):
    name = "tasks"
    description = "Task management — full CRUD with priority and status tracking"

    @operation("list", description="List tasks — filter by status (pending|completed) or project_id")
    async def list_tasks(self, status: str = "", project_id: str = "") -> list:
        tasks = list(_tasks.values())
        if status:
            tasks = [t for t in tasks if t["status"] == status]
        if project_id:
            tasks = [t for t in tasks if t.get("project_id") == project_id]
        return tasks

    @operation("get", description="Get a task by ID")
    async def get_task(self, task_id: str) -> dict:
        task = _tasks.get(task_id)
        if not task:
            raise ValueError(f"Task '{task_id}' not found")
        return task

    @operation("create", description="Create a new task — priority: high | medium | low")
    async def create_task(
        self,
        title: str,
        description: str = "",
        project_id: str = "",
        priority: str = "medium",
    ) -> dict:
        task = {
            "id": str(uuid.uuid4())[:8],
            "title": title,
            "description": description,
            "status": "pending",
            "priority": priority,
            "project_id": project_id or None,
            "created_at": datetime.utcnow().isoformat(),
            "completed_at": None,
        }
        _tasks[task["id"]] = task
        return task

    @operation("update", description="Update task title, description, priority or project_id")
    async def update_task(
        self,
        task_id: str,
        title: str = "",
        description: str = "",
        priority: str = "",
        project_id: str = "",
    ) -> dict:
        task = _tasks.get(task_id)
        if not task:
            raise ValueError(f"Task '{task_id}' not found")
        if title:       task["title"] = title
        if description: task["description"] = description
        if priority:    task["priority"] = priority
        if project_id:  task["project_id"] = project_id
        return task

    @operation("complete", description="Mark a task as completed")
    async def complete_task(self, task_id: str) -> dict:
        task = _tasks.get(task_id)
        if not task:
            raise ValueError(f"Task '{task_id}' not found")
        task["status"] = "completed"
        task["completed_at"] = datetime.utcnow().isoformat()
        return task

    @operation("delete", description="Delete a task by ID")
    async def delete_task(self, task_id: str) -> dict:
        task = _tasks.pop(task_id, None)
        if not task:
            raise ValueError(f"Task '{task_id}' not found")
        return {"deleted": task_id}


class StatsService(SelvansService):
    name = "stats"
    description = "Aggregated statistics across projects and tasks"

    @operation("summary", description="Get totals: projects, tasks by status and priority")
    async def summary(self) -> dict:
        tasks = list(_tasks.values())
        return {
            "total_projects": len(_projects),
            "total_tasks": len(tasks),
            "by_status": {
                "pending":   sum(1 for t in tasks if t["status"] == "pending"),
                "completed": sum(1 for t in tasks if t["status"] == "completed"),
            },
            "by_priority": {
                "high":   sum(1 for t in tasks if t.get("priority") == "high"),
                "medium": sum(1 for t in tasks if t.get("priority") == "medium"),
                "low":    sum(1 for t in tasks if t.get("priority") == "low"),
            },
        }


# ── Seed data ─────────────────────────────────────────────────────────────────

def _seed() -> None:
    now = datetime.utcnow().isoformat()
    _projects["proj-1"] = {
        "id": "proj-1", "name": "Website Redesign",
        "description": "Full redesign of the company website", "created_at": now,
    }
    _projects["proj-2"] = {
        "id": "proj-2", "name": "Mobile App",
        "description": "iOS and Android app", "created_at": now,
    }
    _tasks["task-1"] = {
        "id": "task-1", "title": "Design mockups", "description": "Create Figma mockups",
        "status": "pending", "priority": "high", "project_id": "proj-1",
        "created_at": now, "completed_at": None,
    }
    _tasks["task-2"] = {
        "id": "task-2", "title": "Setup CI/CD", "description": "Configure GitHub Actions",
        "status": "completed", "priority": "medium", "project_id": "proj-1",
        "created_at": now, "completed_at": now,
    }
    _tasks["task-3"] = {
        "id": "task-3", "title": "Write unit tests", "description": "",
        "status": "pending", "priority": "low", "project_id": None,
        "created_at": now, "completed_at": None,
    }
    _tasks["task-4"] = {
        "id": "task-4", "title": "API design", "description": "Define REST endpoints",
        "status": "pending", "priority": "high", "project_id": "proj-2",
        "created_at": now, "completed_at": None,
    }


_seed()


# ── selvans app ────────────────────────────────────────────────────────────

surface = SelvansBeApp(SelvansBeConfig(
    core_url=os.getenv("Selvans_CORE_URL", "http://localhost:8080"),
    app_id=os.getenv("Selvans_APP_ID", "demo-backend"),
))

surface.register(ProjectService())
surface.register(TaskService())
surface.register(StatsService())

app = surface.create_app()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)

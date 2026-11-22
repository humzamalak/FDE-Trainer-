# Set up your tools
<!-- minutes: 45 -->

The exercises in this app run in your browser. You still need real tools, because real work and take-home tests use them.

## 1. Python

1. Install Python 3.12 or newer from python.org. On Windows, select **"Add python.exe to PATH"**.
2. Open PowerShell. Type `python --version`. You must see `Python 3.12.x` or newer.

## 2. VS Code

1. Install VS Code.
2. Install the extensions **Python** (Microsoft) and **Pylance**.
3. Open a folder. Create `hello.py`. Type `print("hello")`. Press the ▶ button.

## 3. Virtual environments

A virtual environment (venv) is a private set of packages for one project. Think of it like a separate AWS account per project: changes in one do not break another.

```powershell
cd Documents\Code\my-project
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install requests
```

When the venv is active, your prompt starts with `(.venv)`.

## 4. Git

You know git already. For coding practice, use this habit:

```bash
git checkout -b exercise/two-sum
# write code, run tests
git add . && git commit -m "Solve two-sum with a hash map"
```

Commit small and often. Your GitHub history is part of your portfolio.

## 5. Practice inside this app

You do not need other practice sites. Every lesson ends with **Practise this lesson**: the tutor writes new exercises for the lesson (easier, same or harder), and the app tests them before you see them. **Drill** gives you random exercises against a 20-minute timer. **Review** brings back quiz questions you got wrong.

:::exercise Your first program
In Python, `print()` shows text, and `=` stores a value in a variable.

Create a variable called `greeting` that contains the text `Hello, FDE` (exactly). Then print it.
--- starter ---
# Make a variable called greeting below

--- tests ---
assert greeting == "Hello, FDE"
--- solution ---
greeting = "Hello, FDE"
print(greeting)
:::

:::quiz
Q: Why use a virtual environment?
- [ ] It makes Python run faster
- [x] It keeps each project's packages separate
- [ ] It is required to run print()
> Like separate AWS accounts: one project's packages cannot break another.
:::

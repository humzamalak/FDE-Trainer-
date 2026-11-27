# Self-hosting models on GPUs
<!-- minutes: 45 -->

This lesson links directly to your H200 cluster. Regulated customers often need **on-prem or private-cloud** inference. Few FDE candidates can do it. You can.

## When to self-host

| Use an API | Self-host |
|---|---|
| Best quality needed | Data cannot leave the network (air-gapped, TRE, defence) |
| Spiky or low volume | High, steady volume where GPUs stay busy |
| Small team, no GPU ops | You already run GPUs (you do) |

Be honest with customers: open-weight models are good but often below the best API models. Run evals on both.

## Inference servers

- **vLLM**: high throughput (continuous batching, PagedAttention for the KV cache). Exposes an **OpenAI-compatible API**, so client code barely changes.
- Others: SGLang, Hugging Face TGI, NVIDIA Triton/TensorRT-LLM, llama.cpp/Ollama for small/local use.

```bash
# On a GPU node (e.g. inside a Slurm job)
vllm serve meta-llama/Llama-3.1-8B-Instruct --tensor-parallel-size 1 --port 8000
```

```python
from openai import OpenAI

client = OpenAI(base_url="http://gpu-node-07:8000/v1", api_key="unused")
client.chat.completions.create(model="meta-llama/Llama-3.1-8B-Instruct", messages=[...])
```

## Key concepts

- **Memory** = weights + KV cache (track 2, lesson 5). Long contexts and many concurrent users need more KV cache.
- **Tensor parallelism**: split one model across several GPUs in a node (fast NVLink).
- **Quantisation** (8-bit, 4-bit, FP8): less memory and faster, small quality loss. Evaluate it.
- **Batching**: many requests share each GPU step. Throughput goes up; latency per request goes up a little.
- **Metrics**: time to first token (TTFT), tokens/second, requests/second, GPU utilisation, queue time.

## Running on Slurm

- Batch inference: an `sbatch` job that processes a file of prompts and exits. Simple and fits HPC well.
- Interactive service: a long-running job (or a dedicated partition/reservation) with a stable endpoint, behind auth (Open OnDemand or a reverse proxy).
- Model weights: store on shared fast storage; mirror them internally for air-gapped use.

:::exercise Pick the tensor-parallel size
vLLM needs the tensor-parallel size to be a power of two (1, 2, 4, 8) and to divide the GPUs in a node. Write `tp_size(weights_gb, gpu_mem_gb, gpus_per_node=8, headroom=0.3)` that returns the smallest power of two whose total usable memory (`n × gpu_mem × (1 - headroom)`) fits the weights. Return `None` if even `gpus_per_node` is not enough.
--- starter ---
def tp_size(weights_gb, gpu_mem_gb, gpus_per_node=8, headroom=0.3):
    pass
--- tests ---
assert tp_size(16, 141) == 1
assert tp_size(140, 141) == 2
assert tp_size(405, 141) == 8
assert tp_size(810, 141) is None
assert tp_size(140, 80, gpus_per_node=4) == 4
--- solution ---
def tp_size(weights_gb, gpu_mem_gb, gpus_per_node=8, headroom=0.3):
    n = 1
    while n <= gpus_per_node:
        if n * gpu_mem_gb * (1 - headroom) >= weights_gb:
            return n
        n *= 2
    return None
:::

:::exercise Write an sbatch script
Write `sbatch_script(job_name, gpus, hours, model)` that returns this text exactly (hours padded to 2 digits):

```
#!/bin/bash
#SBATCH --job-name=JOB_NAME
#SBATCH --partition=gpu
#SBATCH --gres=gpu:GPUS
#SBATCH --time=HH:00:00
vllm serve MODEL --tensor-parallel-size GPUS --port 8000
```
--- starter ---
def sbatch_script(job_name, gpus, hours, model):
    pass
--- tests ---
expected = "#!/bin/bash\n#SBATCH --job-name=llm\n#SBATCH --partition=gpu\n#SBATCH --gres=gpu:2\n#SBATCH --time=08:00:00\nvllm serve org/model --tensor-parallel-size 2 --port 8000"
assert sbatch_script("llm", 2, 8, "org/model") == expected
assert "--time=24:00:00" in sbatch_script("x", 1, 24, "m")
--- solution ---
def sbatch_script(job_name, gpus, hours, model):
    return "\n".join([
        "#!/bin/bash",
        f"#SBATCH --job-name={job_name}",
        "#SBATCH --partition=gpu",
        f"#SBATCH --gres=gpu:{gpus}",
        f"#SBATCH --time={hours:02d}:00:00",
        f"vllm serve {model} --tensor-parallel-size {gpus} --port 8000",
    ])
:::

:::written Plan an extra project: an LLM inference service {#plan-portfolio-project-2}
This is an optional extra project, next to the three in track 4b. Write the 1-page proposal for your manager: an LLM inference service on the LSE H200 cluster. Include: problem, users, scope (what is in and out), architecture, security and governance, success metrics, risks, and a 6-week plan.
--- rubric ---
- Clear user problem and named user groups (researchers, specific use cases)
- Scope with explicit out-of-scope items
- Architecture: vLLM (or similar) on Slurm, access via Open OnDemand/AD auth, model storage, monitoring (Grafana)
- Governance: which data is allowed (not TRE data initially), logging, acceptable use, licence of model weights
- Measurable success metrics (users, latency, utilisation, cost vs cloud) and risks with mitigations
- Realistic phased plan with a pilot
:::

:::quiz
Q: Why is vLLM's OpenAI-compatible API useful?
- [x] Existing client code (OpenAI SDK, LangChain, etc.) works by changing only the base URL
- [ ] It makes the model as good as GPT
- [ ] It removes the need for GPUs
:::

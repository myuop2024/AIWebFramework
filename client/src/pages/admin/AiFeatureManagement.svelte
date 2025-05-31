<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { writable, type Writable } from 'svelte/store';
  import Button from '../../components/Button.svelte';
  import TextInput from '../../components/TextInput.svelte'; // For model ID inputs
  import Switch from '../../components/Switch.svelte'; // Assuming a common Switch component
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Shadcn select
  import toast from 'svelte-french-toast';
  import { Label } from '@/components/ui/label';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

  // Matches Zod schema on backend, but simplified for client state
  interface AiFeatureSettings {
    AI_FEATURE_TREND_EXPLANATIONS?: { enabled: boolean };
    AI_FEATURE_HOTSPOT_ANALYSIS?: { enabled: boolean; criticalReportThreshold: number };
    AI_FEATURE_INSIGHT_ACTIONS?: { enabled: boolean };
    AI_MODEL_TEXT_CLASSIFICATION?: { modelId: string };
    AI_MODEL_TEXT_GENERATION?: { modelId: string };
    AI_MODEL_SUMMARIZATION?: { modelId: string };
    AI_MODEL_QUESTION_ANSWERING?: { modelId: string };
    AI_MODEL_ZERO_SHOT_CLASSIFICATION?: { modelId: string };
  }

  let settings: Writable<AiFeatureSettings> = writable({});
  let isLoading = writable(false);
  let initialLoading = writable(true);

  // Available models (could be fetched from an API in a real app)
  const availableModels = {
    textClassification: [
      'siebert/sentiment-roberta-large-english',
      'distilbert-base-uncased-finetuned-sst-2-english',
      'facebook/bart-large-mnli' // Also good for NLI/zero-shot but can be used here
    ],
    textGeneration: [
      'meta-llama/Llama-3.1-8B-Instruct',
      'gpt2',
      'distilgpt2',
      'google/gemma-7b-it', // Example, ensure license compatibility
    ],
    summarization: [
      'facebook/bart-large-cnn',
      'sshleifer/distilbart-cnn-12-6',
      'google/pegasus-xsum'
    ],
    questionAnswering: [
      'deepset/roberta-base-squad2',
      'distilbert-base-cased-distilled-squad'
    ],
    zeroShotClassification: [
      'facebook/bart-large-mnli',
      'MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7'
    ],
  };

  const defaultSettings: AiFeatureSettings = {
    AI_FEATURE_TREND_EXPLANATIONS: { enabled: true },
    AI_FEATURE_HOTSPOT_ANALYSIS: { enabled: true, criticalReportThreshold: 3 },
    AI_FEATURE_INSIGHT_ACTIONS: { enabled: true },
    AI_MODEL_TEXT_CLASSIFICATION: { modelId: 'siebert/sentiment-roberta-large-english' },
    AI_MODEL_TEXT_GENERATION: { modelId: 'meta-llama/Llama-3.1-8B-Instruct' },
    AI_MODEL_SUMMARIZATION: { modelId: 'facebook/bart-large-cnn' },
    AI_MODEL_QUESTION_ANSWERING: { modelId: 'deepset/roberta-base-squad2' },
    AI_MODEL_ZERO_SHOT_CLASSIFICATION: { modelId: 'facebook/bart-large-mnli' },
  };

  async function fetchSettings() {
    isLoading.set(true);
    initialLoading.set(true);
    try {
      const response = await fetch('/api/admin/settings/ai-features');
      if (response.ok) {
        const data = await response.json();
        // Merge fetched settings with defaults to ensure all UI elements have values
        const mergedSettings: AiFeatureSettings = {};
        for (const key in defaultSettings) {
            mergedSettings[key] = data[key] !== undefined ? data[key] : defaultSettings[key];
        }
        settings.set(mergedSettings);

      } else {
        toast.error('Failed to fetch AI feature settings. Using defaults.');
        settings.set(defaultSettings);
      }
    } catch (e: any) {
      toast.error(`Error fetching settings: ${e.message}. Using defaults.`);
      settings.set(defaultSettings);
    } finally {
      isLoading.set(false);
      initialLoading.set(false);
    }
  }

  async function saveSettings() {
    isLoading.set(true);
    try {
      // Ensure all parts of settings are correctly structured before sending
      const currentSettings = $settings;
      const payload: Partial<AiFeatureSettings> = {};

      // Validate and structure each setting
      if (currentSettings.AI_FEATURE_TREND_EXPLANATIONS) payload.AI_FEATURE_TREND_EXPLANATIONS = { enabled: !!currentSettings.AI_FEATURE_TREND_EXPLANATIONS.enabled };
      if (currentSettings.AI_FEATURE_HOTSPOT_ANALYSIS) payload.AI_FEATURE_HOTSPOT_ANALYSIS = { enabled: !!currentSettings.AI_FEATURE_HOTSPOT_ANALYSIS.enabled, criticalReportThreshold: Number(currentSettings.AI_FEATURE_HOTSPOT_ANALYSIS.criticalReportThreshold) || 3 };
      if (currentSettings.AI_FEATURE_INSIGHT_ACTIONS) payload.AI_FEATURE_INSIGHT_ACTIONS = { enabled: !!currentSettings.AI_FEATURE_INSIGHT_ACTIONS.enabled };

      if (currentSettings.AI_MODEL_TEXT_CLASSIFICATION) payload.AI_MODEL_TEXT_CLASSIFICATION = { modelId: currentSettings.AI_MODEL_TEXT_CLASSIFICATION.modelId || defaultSettings.AI_MODEL_TEXT_CLASSIFICATION!.modelId };
      if (currentSettings.AI_MODEL_TEXT_GENERATION) payload.AI_MODEL_TEXT_GENERATION = { modelId: currentSettings.AI_MODEL_TEXT_GENERATION.modelId || defaultSettings.AI_MODEL_TEXT_GENERATION!.modelId };
      if (currentSettings.AI_MODEL_SUMMARIZATION) payload.AI_MODEL_SUMMARIZATION = { modelId: currentSettings.AI_MODEL_SUMMARIZATION.modelId || defaultSettings.AI_MODEL_SUMMARIZATION!.modelId };
      if (currentSettings.AI_MODEL_QUESTION_ANSWERING) payload.AI_MODEL_QUESTION_ANSWERING = { modelId: currentSettings.AI_MODEL_QUESTION_ANSWERING.modelId || defaultSettings.AI_MODEL_QUESTION_ANSWERING!.modelId };
      if (currentSettings.AI_MODEL_ZERO_SHOT_CLASSIFICATION) payload.AI_MODEL_ZERO_SHOT_CLASSIFICATION = { modelId: currentSettings.AI_MODEL_ZERO_SHOT_CLASSIFICATION.modelId || defaultSettings.AI_MODEL_ZERO_SHOT_CLASSIFICATION!.modelId };

      const response = await fetch('/api/admin/settings/ai-features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        toast.success('AI feature settings saved successfully!');
        const data = await response.json(); // Backend should return the saved state or confirmation
        // settings.set(data); // Optionally update state from response
      } else {
        const errData = await response.json();
        toast.error(errData.message || 'Failed to save settings.');
      }
    } catch (e: any) {
      toast.error(`Error saving settings: ${e.message}`);
    } finally {
      isLoading.set(false);
    }
  }

  onMount(fetchSettings);

  // Helper to bind select values for models
  function bindModelSelect(key: keyof AiFeatureSettings, subKey: 'modelId') {
    return (event: Event) => {
      const target = event.target as HTMLSelectElement;
      settings.update(s => {
        const settingPart = s[key] || {};
        (settingPart as any)[subKey] = target.value;
        return { ...s, [key]: settingPart };
      });
    };
  }
</script>

<div class="container mx-auto p-4 md:p-8">
  <h1 class="text-2xl font-bold mb-6 text-gray-800 dark:text-white">AI Feature Management</h1>

  {#if $initialLoading}
    <p>Loading AI settings...</p>
  {:else}
  <form on:submit|preventDefault={saveSettings} class="space-y-8">
    <Card>
      <CardHeader>
        <CardTitle>Feature Toggles</CardTitle>
        <CardDescription>Enable or disable specific AI-powered features.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div>
          <Switch id="trendExplanations" bind:checked={$settings.AI_FEATURE_TREND_EXPLANATIONS!.enabled} disabled={$isLoading}>
            AI Trend Explanations
          </Switch>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Generate textual explanations for observed report trends.</p>
        </div>
        <div>
          <Switch id="hotspotAnalysis" bind:checked={$settings.AI_FEATURE_HOTSPOT_ANALYSIS!.enabled} disabled={$isLoading}>
            Polling Station Hotspot Analysis
          </Switch>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Identify and summarize issues at high-activity polling stations.</p>
        </div>
        {#if $settings.AI_FEATURE_HOTSPOT_ANALYSIS?.enabled}
          <div class="pl-8">
            <Label for="hotspotThreshold" class="text-sm">Hotspot Critical Report Threshold:</Label>
            <TextInput type="number" id="hotspotThreshold" bind:value={$settings.AI_FEATURE_HOTSPOT_ANALYSIS!.criticalReportThreshold} min="1" max="100" class="w-24 mt-1" disabled={$isLoading}/>
          </div>
        {/if}
        <div>
          <Switch id="insightActions" bind:checked={$settings.AI_FEATURE_INSIGHT_ACTIONS!.enabled} disabled={$isLoading}>
            Actionable Recommendations for Insights
          </Switch>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Generate suggested actions based on AI-identified insights.</p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>AI Model Selection</CardTitle>
        <CardDescription>Choose the underlying AI models for specific tasks. Ensure compatibility and performance.</CardDescription>
      </CardHeader>
      <CardContent class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label for="textClassificationModel" class="font-semibold">Text Classification Model:</Label>
          <Select value={$settings.AI_MODEL_TEXT_CLASSIFICATION?.modelId} on:change={bindModelSelect('AI_MODEL_TEXT_CLASSIFICATION', 'modelId')} disabled={$isLoading}>
            <SelectTrigger id="textClassificationModel"><SelectValue placeholder="Select model" /></SelectTrigger>
            <SelectContent>
              {#each availableModels.textClassification as model}
                <SelectItem value={model}>{model}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label for="textGenerationModel" class="font-semibold">Text Generation Model:</Label>
           <Select value={$settings.AI_MODEL_TEXT_GENERATION?.modelId} on:change={bindModelSelect('AI_MODEL_TEXT_GENERATION', 'modelId')} disabled={$isLoading}>
            <SelectTrigger id="textGenerationModel"><SelectValue placeholder="Select model" /></SelectTrigger>
            <SelectContent>
              {#each availableModels.textGeneration as model}
                <SelectItem value={model}>{model}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label for="summarizationModel" class="font-semibold">Summarization Model:</Label>
          <Select value={$settings.AI_MODEL_SUMMARIZATION?.modelId} on:change={bindModelSelect('AI_MODEL_SUMMARIZATION', 'modelId')} disabled={$isLoading}>
            <SelectTrigger id="summarizationModel"><SelectValue placeholder="Select model" /></SelectTrigger>
            <SelectContent>
              {#each availableModels.summarization as model}
                <SelectItem value={model}>{model}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label for="qaModel" class="font-semibold">Question Answering Model:</Label>
          <Select value={$settings.AI_MODEL_QUESTION_ANSWERING?.modelId} on:change={bindModelSelect('AI_MODEL_QUESTION_ANSWERING', 'modelId')} disabled={$isLoading}>
            <SelectTrigger id="qaModel"><SelectValue placeholder="Select model" /></SelectTrigger>
            <SelectContent>
              {#each availableModels.questionAnswering as model}
                <SelectItem value={model}>{model}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label for="zeroShotModel" class="font-semibold">Zero-Shot Classification Model:</Label>
           <Select value={$settings.AI_MODEL_ZERO_SHOT_CLASSIFICATION?.modelId} on:change={bindModelSelect('AI_MODEL_ZERO_SHOT_CLASSIFICATION', 'modelId')} disabled={$isLoading}>
            <SelectTrigger id="zeroShotModel"><SelectValue placeholder="Select model" /></SelectTrigger>
            <SelectContent>
              {#each availableModels.zeroShotClassification as model}
                <SelectItem value={model}>{model}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>

    <div class="flex justify-end">
      <Button type="submit" isLoading={$isLoading} disabled={$isLoading}>
        {#if $isLoading}Saving...{:else}Save AI Settings{/if}
      </Button>
    </div>
  </form>
  {/if}
</div>

<style>
  /* Basic styling, can be enhanced or use Tailwind utility classes more directly if preferred */
  .container { max-width: 900px; }
  label { display: block; margin-bottom: 0.25rem; }
</style>

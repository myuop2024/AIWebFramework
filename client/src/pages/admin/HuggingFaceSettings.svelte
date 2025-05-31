<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import Button from '../../components/Button.svelte'; // Assuming a common Button component exists
  import TextInput from '../../components/TextInput.svelte'; // Assuming a common TextInput component exists
  import toast from 'svelte-french-toast'; // For notifications

  let apiKey = writable('');
  let currentApiKeyDisplay = writable('••••••••••••••••••••••••••••••••••••••••'); // Masked display
  let isLoading = writable(false);
  let error = writable<string | null>(null);

  async function fetchApiKey() {
    isLoading.set(true);
    error.set(null);
    try {
      const response = await fetch('/api/admin/settings/huggingface-api-key');
      if (response.ok) {
        const data = await response.json();
        if (data.apiKeyExists) {
          // We don't get the key itself, just its existence status for security
          apiKey.set(''); // Clear input field
          currentApiKeyDisplay.set('•••••••••••••••••••••••••••••••••••••••• (Key is set)');
        } else {
          currentApiKeyDisplay.set('Not set');
          apiKey.set('');
        }
      } else {
        const errData = await response.json();
        error.set(errData.message || 'Failed to fetch API key status');
        toast.error(errData.message || 'Failed to fetch API key status');
      }
    } catch (e: any) {
      error.set(e.message || 'An error occurred');
      toast.error(e.message || 'An error occurred fetching status');
    } finally {
      isLoading.set(false);
    }
  }

  async function saveApiKey() {
    if (!$apiKey.trim()) {
      toast.error('API Key cannot be empty.');
      return;
    }
    isLoading.set(true);
    error.set(null);
    try {
      const response = await fetch('/api/admin/settings/huggingface-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: $apiKey }),
      });
      if (response.ok) {
        toast.success('API Key saved successfully!');
        apiKey.set(''); // Clear input after saving
        await fetchApiKey(); // Refresh status
      } else {
        const errData = await response.json();
        error.set(errData.message || 'Failed to save API key');
        toast.error(errData.message || 'Failed to save API key');
      }
    } catch (e: any) {
      error.set(e.message || 'An error occurred');
      toast.error(e.message || 'An error occurred saving key');
    } finally {
      isLoading.set(false);
    }
  }

  async function deleteApiKey() {
    if (!confirm('Are you sure you want to delete the API Key? This will revert to using the Replit Secret if set.')) {
      return;
    }
    isLoading.set(true);
    error.set(null);
    try {
      const response = await fetch('/api/admin/settings/huggingface-api-key', {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('API Key deleted successfully!');
        await fetchApiKey(); // Refresh status
      } else {
        const errData = await response.json();
        error.set(errData.message || 'Failed to delete API key');
        toast.error(errData.message || 'Failed to delete API key');
      }
    } catch (e: any) {
      error.set(e.message || 'An error occurred');
      toast.error(e.message || 'An error occurred deleting key');
    } finally {
      isLoading.set(false);
    }
  }

  onMount(() => {
    fetchApiKey();
  });
</script>

<div class="container mx-auto p-4 md:p-8">
  <h1 class="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Hugging Face API Key Settings</h1>

  <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
    <div class="mb-4">
      <p class="text-gray-700 dark:text-gray-300 mb-1">Current API Key Status:</p>
      <p class="text-lg font-semibold text-blue-600 dark:text-blue-400">{$currentApiKeyDisplay}</p>
      {#if $error}
        <p class="text-red-500 text-sm mt-1">Error: {$error}</p>
      {/if}
    </div>

    <form on:submit|preventDefault={saveApiKey} class="space-y-4">
      <div>
        <label for="apiKey" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Set or Update API Key:
        </label>
        <TextInput
          id="apiKey"
          type="password"
          placeholder="Enter new Hugging Face API Key (e.g., hf_...)"
          bind:value={$apiKey}
          disabled={$isLoading}
          required={true}
          class="w-full"
        />
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            The API key will be stored securely on the server. It will not be directly viewable after saving.
            If a key is set here, it will override any key set in Replit Secrets for server-side operations.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
        <Button type="submit" disabled={$isLoading} isLoading={$isLoading} class="w-full sm:w-auto">
          {#if $isLoading}Saving...{:else}Save API Key{/if}
        </Button>
         <Button on:click={deleteApiKey} type="button" disabled={$isLoading || $currentApiKeyDisplay === 'Not set'} isLoading={false} variant="danger" class="w-full sm:w-auto">
          Delete API Key
        </Button>
      </div>
    </form>
  </div>

  <div class="bg-yellow-100 dark:bg-yellow-700 border-l-4 border-yellow-500 dark:border-yellow-300 text-yellow-700 dark:text-yellow-200 p-4 rounded-md" role="alert">
    <p class="font-bold">Important Notes:</p>
    <ul class="list-disc list-inside text-sm">
      <li>Setting an API key here will override any Hugging Face API key possibly configured via Replit Secrets for server-side analytics.</li>
      <li>If no key is set here, the application will attempt to use the key from Replit Secrets (if available).</li>
      <li>The API key is used for AI-powered analytics features within the application. Ensure the key has the necessary permissions for inference.</li>
       <li>Deleting the key from here will revert the system to using the Replit Secret, if one is defined.</li>
    </ul>
  </div>
</div>

<style>
  /* Basic styling, can be enhanced or use Tailwind utility classes more directly if preferred */
  .container {
    max-width: 800px;
  }
</style>

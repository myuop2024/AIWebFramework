import React, { useEffect, useState } from 'react';
import RecordRTC, { RecordRTCPromisesHandler } from 'recordrtc';
import { Button } from '@/components/ui/button';

interface LocalMemo {
  id: string;
  blob: Blob;
  synced: boolean;
}

export function VoiceMemos() {
  const [recorder, setRecorder] = useState<RecordRTCPromisesHandler | null>(null);
  const [recording, setRecording] = useState(false);
  const [memos, setMemos] = useState<LocalMemo[]>([]);

  // Load unsynced memos from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('voiceMemos');
    if (stored) {
      const arr: { id: string; data: string; synced: boolean }[] = JSON.parse(stored);
      arr.forEach(item => {
        fetch(item.data).then(r => r.blob()).then(b => {
          setMemos(m => [...m, { id: item.id, blob: b, synced: item.synced }]);
        });
      });
    }
  }, []);

  const saveMemos = (items: LocalMemo[]) => {
    Promise.all(items.map(async m => ({
      id: m.id,
      data: await blobToDataURL(m.blob),
      synced: m.synced
    }))).then(arr => {
      localStorage.setItem('voiceMemos', JSON.stringify(arr));
    });
  };

  const blobToDataURL = (blob: Blob) => new Promise<string>(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new RecordRTCPromisesHandler(stream, { type: 'audio' });
    await rec.startRecording();
    setRecorder(rec);
    setRecording(true);
  };

  const stopRecording = async () => {
    if (!recorder) return;
    await recorder.stopRecording();
    const blob = await recorder.getBlob();
    const id = Date.now().toString();
    const memo: LocalMemo = { id, blob, synced: false };
    const next = [...memos, memo];
    setMemos(next);
    saveMemos(next);
    setRecording(false);
  };

  const syncMemos = async () => {
    const updated: LocalMemo[] = [];
    for (const memo of memos) {
      if (memo.synced) { updated.push(memo); continue; }
      const formData = new FormData();
      formData.append('file', memo.blob, `memo-${memo.id}.webm`);
      try {
        const res = await fetch('/api/voice-memos', { method: 'POST', body: formData });
        if (res.ok) {
          updated.push({ ...memo, synced: true });
        } else {
          updated.push(memo);
        }
      } catch {
        updated.push(memo);
      }
    }
    setMemos(updated);
    saveMemos(updated);
  };

  return (
    <div className="space-y-2">
      <Button onClick={recording ? stopRecording : startRecording}>
        {recording ? 'Stop Recording' : 'Record Voice Memo'}
      </Button>
      <Button onClick={syncMemos} disabled={!navigator.onLine || memos.every(m => m.synced)}>
        Sync Pending ({memos.filter(m => !m.synced).length})
      </Button>
      <ul className="text-sm">
        {memos.map(m => (
          <li key={m.id}>{m.synced ? 'Synced' : 'Pending'} memo {m.id}</li>
        ))}
      </ul>
    </div>
  );
}

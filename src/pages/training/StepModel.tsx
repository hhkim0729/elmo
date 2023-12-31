import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MdDownload } from 'react-icons/md';
import { downloadModel, getPreTrainedModels } from '@/api/rest';
import { connectSocket } from '@/utils';
import Button from '@/components/Button';
import MainTemplate from '@/components/MainTemplate';
import CheckBox from '@/components/CheckBox';
import Label from '@/components/Label';
import Spinner from '@/components/Spinner';
import { QUERY_KEYS, SOCKET_API_URL } from '@/constants';
import { SocketProgress, PreTrainedModel, TrainingForm } from '@/types';

interface Props {
  setFormData: React.Dispatch<React.SetStateAction<TrainingForm>>;
  onNext: () => void;
}

export default function StepModel({ setFormData, onNext }: Props) {
  const [selected, setSelected] = useState<PreTrainedModel | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<SocketProgress | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  const { data: models } = useQuery({
    queryKey: [QUERY_KEYS.PRE_TRAINED_MODELS],
    queryFn: getPreTrainedModels,
  });

  const handleSocketMessage = (data: string) => {
    const parsed = JSON.parse(data);
    setDownloadProgress(parsed);
    if (parsed.curr_percent === 100) {
      setIsDownloading(false);
      setDownloadProgress(null);
      setSelected((prev) => prev && { ...prev, is_downloaded: true });
      queryClient.invalidateQueries([QUERY_KEYS.PRE_TRAINED_MODELS]);
      socket.current?.close();
    }
  };

  const handleDownload = () => {
    socket.current = connectSocket(SOCKET_API_URL, handleSocketMessage);
    setIsDownloading(true);
  };

  const handleNext = () => {
    if (!selected) return;
    setFormData((prev) => ({
      ...prev,
      pm_no: selected.pm_no,
    }));
    onNext();
  };

  return (
    <MainTemplate
      title="Select Model"
      description="Select pre-trained model to train."
    >
      <div className="w-full h-[28rem] flex">
        <div className="flex flex-col basis-3/5 border-2 border-secondary">
          <h4 className="list-title">Models</h4>
          <ul className="list-container p-3">
            {models?.map((model) => (
              <ModelListItem
                key={model.pm_no}
                model={model}
                checked={selected?.pm_no === model.pm_no}
                isDownloading={isDownloading}
                onCheckedChange={() =>
                  setSelected(selected === model ? null : model)
                }
                onDownload={handleDownload}
              />
            ))}
          </ul>
        </div>
        <div className="flex-1 p-4 border-2 border-l-0 border-secondary overflow-y-scroll whitespace-pre-line">
          {selected ? (
            <>
              <div className="flex gap-4 text-xs mb-2">
                <p className="mb-2">
                  {selected?.is_downloaded
                    ? 'Downloaded'
                    : isDownloading
                    ? 'Downloading...'
                    : 'Need to download'}
                </p>
                {isDownloading &&
                  downloadProgress?.model_name === selected.name && (
                    <p>
                      <span>
                        {downloadProgress.curr_size}&#32;/&#32;
                        {downloadProgress.total}
                      </span>
                      <span>&#32;({downloadProgress.curr_percent}%)</span>
                    </p>
                  )}
              </div>
              <h3 className="text-2xl mb-2">{selected.name}</h3>
              <p className="text-sm">{selected.description}</p>
            </>
          ) : (
            <p className="text-sm">Please select a model.</p>
          )}
        </div>
      </div>
      <div className="py-6 text-center">
        <Button disabled={!selected?.is_downloaded} onClick={handleNext}>
          Next
        </Button>
      </div>
    </MainTemplate>
  );
}

interface ModelListItemProps {
  model: PreTrainedModel;
  checked: boolean;
  isDownloading: boolean;
  onCheckedChange: () => void;
  onDownload: () => void;
}

const ModelListItem = ({
  model,
  checked,
  isDownloading,
  onCheckedChange,
  onDownload,
}: ModelListItemProps) => {
  const downloadMutation = useMutation({
    mutationFn: () => downloadModel(model.name),
    onSuccess: onDownload,
  });

  return (
    <li className="list">
      <div className="flex gap-4 items-center">
        <CheckBox
          id={model.name}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
        <Label
          id={model.name}
          label={model.name}
          isSide
          className={`font-normal cursor-pointer ${
            !model.is_downloaded && 'text-line'
          }`}
        ></Label>
      </div>
      <div className="h-full">
        {!model.is_downloaded && (
          <>
            {isDownloading ? (
              <Spinner />
            ) : (
              <Button
                className="w-fit p-0 bg-transparent text-line"
                onClick={() => downloadMutation.mutate()}
              >
                <MdDownload />
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  );
};

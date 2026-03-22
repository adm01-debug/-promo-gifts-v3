/**
 * ProductImageGallery — Orchestrator component.
 * All logic extracted to useProductImageGallery hook.
 * All UI sections extracted to sub-components.
 */
import { Filter } from 'lucide-react';
import { useProductImageGallery } from './useProductImageGallery';
import { ImageFilterBar } from './ImageFilterBar';
import { ImageBulkToolbar } from './ImageBulkToolbar';
import { ImageGrid } from './ImageGrid';
import { ImageUploadArea } from './ImageUploadArea';
import { ImagePreviewDialog } from './ImagePreviewDialog';
import { ImageStatsBar } from './ImageStatsBar';

interface ProductImageGalleryProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder?: string;
  productId?: string;
}

export function ProductImageGallery({ images, onChange, folder = 'products', productId }: ProductImageGalleryProps) {
  const g = useProductImageGallery({ images, onChange, folder, productId });
  const hasVariants = g.stats.byVariant.size > 0;

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      {g.externalImages.length > 0 && (
        <ImageFilterBar
          filterMode={g.filterMode} setFilterMode={g.setFilterMode}
          typeFilter={g.typeFilter} setTypeFilter={g.setTypeFilter}
          stats={g.stats} activeTypes={g.activeTypes}
          variantMap={g.variantMap} hasVariants={hasVariants}
        />
      )}

      {/* Bulk toolbar */}
      {images.length > 0 && (
        <ImageBulkToolbar
          bulkMode={g.bulkMode} setBulkMode={g.setBulkMode}
          clearSelection={g.clearSelection} selectAll={g.selectAll}
          filteredImagesCount={g.filteredImages.length}
          selectedUrls={g.selectedUrls} setSelectedUrls={g.setSelectedUrls}
          bulkUpdateType={g.bulkUpdateType} bulkUpdateVariant={g.bulkUpdateVariant}
          bulkDelete={g.bulkDelete} isBulkUpdating={g.isBulkUpdating}
          variants={g.variants}
        />
      )}

      {/* Image grid */}
      {g.filteredImages.length > 0 && (
        <ImageGrid
          filteredImages={g.filteredImages} images={images}
          extImageMap={g.extImageMap} variantMap={g.variantMap}
          bulkMode={g.bulkMode} selectedUrls={g.selectedUrls}
          editingIndex={g.editingIndex} dragIndex={g.dragIndex} dragOverIndex={g.dragOverIndex}
          toggleSelect={g.toggleSelect}
          handleDragStart={g.handleDragStart} handleDragOver={g.handleDragOver}
          handleDrop={g.handleDrop} handleDragEnd={g.handleDragEnd}
          setPreviewUrl={g.setPreviewUrl} setEditingIndex={g.setEditingIndex}
          handleSetPrimary={g.handleSetPrimary} handleRemove={g.handleRemove}
          updateExternalImageMeta={g.updateExternalImageMeta}
        />
      )}

      {/* Empty filtered state */}
      {g.filteredImages.length === 0 && images.length > 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Filter className="h-5 w-5 mx-auto mb-2 opacity-40" />
          Nenhuma imagem corresponde ao filtro selecionado
        </div>
      )}

      {/* Stats bar */}
      {g.externalImages.length > 0 && <ImageStatsBar stats={g.stats} />}

      {/* Upload area */}
      <ImageUploadArea
        productId={productId} variants={g.variants} variantMap={g.variantMap}
        uploadVariant={g.uploadVariant} setUploadVariant={g.setUploadVariant}
        uploadImageType={g.uploadImageType} setUploadImageType={g.setUploadImageType}
        isUploading={g.isUploading} uploadCount={g.uploadCount}
        fileInputRef={g.fileInputRef} handleFilesChange={g.handleFilesChange}
        handleDropZone={g.handleDropZone}
      />

      {/* Preview dialog */}
      <ImagePreviewDialog
        previewUrl={g.previewUrl} onClose={() => g.setPreviewUrl(null)}
        extImageMap={g.extImageMap} variantMap={g.variantMap}
      />
    </div>
  );
}

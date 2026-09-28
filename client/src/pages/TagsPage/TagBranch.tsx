import type { TagDTO } from '../../../../shared/types';
import { TagChip } from '../../components/TagChip';
import { TagForm } from './TagForm';
import { TagRow } from './TagRow';
import { isAddingChildTo, isEditing, type TagTreeController } from './tagTreeController';

interface TagBranchProps {
  tag: TagDTO;
  depth: number;
  tree: TagTreeController;
}

/**
 * Ветка дерева: строка тега, его непосредственные дети в одну строку
 * и раскрытые дети ниже — рекурсивно, без ограничения глубины.
 */
export function TagBranch({ tag, depth, tree }: TagBranchProps) {
  const children = tree.index.childrenOf(tag.id);
  const openChildren = children.filter((child) => tree.isOpen(child.id));

  return (
    <div className={depth === 0 ? 'tag-branch' : 'tag-branch tag-branch--nested'}>
      {isEditing(tree.editor, tag.id) ? (
        <TagForm tag={tag} onSubmit={tree.save} onCancel={tree.closeEditor} />
      ) : (
        <TagRow tag={tag} tree={tree} size={depth === 0 ? 'md' : 'sm'} showPath={depth > 0} />
      )}

      {isAddingChildTo(tree.editor, tag.id) && (
        <TagForm defaultParentId={tag.id} onSubmit={tree.save} onCancel={tree.closeEditor} />
      )}

      {children.length > 0 && (
        <div className="tag-branch__children">
          {children.map((child) => {
            const grandchildren = tree.index.childrenOf(child.id).length;
            return (
              <TagChip
                key={child.id}
                name={child.name}
                color={child.color}
                active={tree.isOpen(child.id)}
                trailing={grandchildren > 0 && <span className="tag-branch__count">{grandchildren}</span>}
                onClick={() => tree.toggleOpen(child.id)}
              />
            );
          })}
        </div>
      )}

      {openChildren.map((child) => (
        <TagBranch key={child.id} tag={child} depth={depth + 1} tree={tree} />
      ))}
    </div>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatBalance, convertBalance, useLanguage } from '../../context/LanguageContext';
import './DashboardPages.css';
import './Tree.css';

const CHILD_ROLES = ['partner', 'superadmin', 'admin', 'cashier', 'player'];

function getAncestorIds(userId, users) {
  const ids = [];
  let u = users.find((x) => x.id === userId);
  while (u?.parentId) {
    ids.push(u.parentId);
    u = users.find((x) => x.id === u.parentId);
  }
  return ids;
}

function TreeTableRow({
  node: u,
  users,
  level,
  canSeeUserBalance,
  viewerRole,
  expandedIds,
  onToggle,
  visibleIds,
  displayCurrency,
  detailsOpenId,
  onDetailsToggle,
  currentUser,
  transfer,
  withdraw,
  canTransferTo,
  canWithdrawFrom,
  setUserStatus,
  canBanUser,
  canCreateRole,
  ROLES,
  t,
}) {
  const children = users.filter((x) => x.parentId === u.id);
  const showBalance = viewerRole && canSeeUserBalance(viewerRole, u);
  const isExpanded = expandedIds.has(u.id);
  const hasChildren = children.length > 0;
  const visibleChildren = visibleIds ? children.filter((c) => visibleIds.has(c.id)) : children;
  const showExpand = hasChildren && (visibleIds === null || visibleChildren.length > 0);
  const detailsOpen = detailsOpenId === u.id;
  const parent = u.parentId ? users.find((x) => x.id === u.parentId) : null;
  const childrenToShow = visibleIds ? visibleChildren : children;

  const canCredit = currentUser && u.id !== currentUser.id && canTransferTo(currentUser.role, u.role);
  const canWithdrawThis = currentUser && u.id !== currentUser.id && canWithdrawFrom(currentUser, u, users);
  const canBan = currentUser && u.role !== ROLES.MASTER && canBanUser(currentUser, u);
  const isBanned = u.status === 'banned';
  const canAddChild = currentUser && u.id === currentUser.id && CHILD_ROLES.some((r) => canCreateRole(currentUser.role, r));

  const [actionAmount, setActionAmount] = useState('');
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

  const handleCredit = async () => {
    setActionMsg({ type: '', text: '' });
    const num = Number(String(actionAmount).replace(',', '.'));
    if (!num || num <= 0) {
      setActionMsg({ type: 'error', text: t('amount') });
      return;
    }
    const amountInTargetCurrency = convertBalance(num, displayCurrency, u.currency || 'TND');
    const result = await transfer(u.id, amountInTargetCurrency, '');
    if (result.ok) {
      setActionMsg({ type: 'success', text: t('creditDone') });
      setActionAmount('');
    } else setActionMsg({ type: 'error', text: result.error });
  };

  const handleWithdraw = async () => {
    setActionMsg({ type: '', text: '' });
    const num = Number(String(actionAmount).replace(',', '.'));
    if (!num || num <= 0) {
      setActionMsg({ type: 'error', text: t('amount') });
      return;
    }
    const amountInAccountCurrency = convertBalance(num, displayCurrency, u.currency || 'TND');
    const result = await withdraw(u.id, amountInAccountCurrency, '');
    if (result.ok) {
      setActionMsg({ type: 'success', text: t('withdrawDone') });
      setActionAmount('');
    } else setActionMsg({ type: 'error', text: result.error });
  };

  const handleBan = async () => {
    setActionMsg({ type: '', text: '' });
    const result = await setUserStatus(u.id, 'banned');
    if (result.ok) setActionMsg({ type: 'success', text: t('accountBanned') });
    else setActionMsg({ type: 'error', text: result.error });
  };

  const handleUnban = async () => {
    setActionMsg({ type: '', text: '' });
    const result = await setUserStatus(u.id, 'active');
    if (result.ok) setActionMsg({ type: 'success', text: t('accountUnbanned') });
    else setActionMsg({ type: 'error', text: result.error });
  };

  return (
    <>
      <tr className={`tree-table-row ${isBanned ? 'tree-row-banned' : ''}`}>
        <td className="tree-td-sub">
          {showExpand ? (
            <button
              type="button"
              className="tree-expand-btn"
              onClick={() => onToggle(u.id)}
              aria-expanded={isExpanded}
              title={isExpanded ? 'Replier' : 'Développer'}
            >
              {isExpanded ? '−' : '+'}
            </button>
          ) : (
            <span className="tree-expand-placeholder" />
          )}
          <span className="tree-login" style={{ paddingLeft: level * 16 }}>{u.login}</span>
          {isBanned && <span className="tree-badge-banned">{t('banned')}</span>}
        </td>
        <td className="tree-td-parent">
          {parent ? <span className="tree-parent-arrow" title={parent.login}>↑</span> : '—'}
        </td>
        <td className="tree-td-level"><span className="tree-role-badge">{u.role}</span></td>
        <td className="tree-td-id">{u.accountId ?? '—'}</td>
        <td className="tree-td-balance">
          {showBalance
            ? formatBalance(convertBalance(u.balance ?? 0, u.currency, displayCurrency), displayCurrency)
            : '—'}
        </td>
        <td className="tree-td-actions">
          <button
            type="button"
            className="tree-details-btn"
            onClick={() => onDetailsToggle(u.id)}
            title={t('treeDetails')}
            aria-expanded={detailsOpen}
          >
            ▶
          </button>
          {(canCredit || canWithdrawThis || canBan || canAddChild) && (
            <span className="tree-row-actions">
              {canWithdrawThis && (
                <button type="button" className="tree-btn-minus" onClick={handleWithdraw} title={t('withdraw')} disabled={!actionAmount || Number(String(actionAmount).replace(',', '.')) <= 0}>−</button>
              )}
              {(canCredit || canWithdrawThis) && (
                <input type="text" className="tree-amount-input" placeholder={t('amount')} value={actionAmount} onChange={(e) => setActionAmount(e.target.value)} />
              )}
              {canCredit && (
                <button type="button" className="tree-btn-plus" onClick={handleCredit} title={t('credit')} disabled={!actionAmount || Number(String(actionAmount).replace(',', '.')) <= 0}>+</button>
              )}
              {canBan && (
                <button type="button" className={isBanned ? 'tree-btn-unban' : 'tree-btn-ban'} onClick={isBanned ? handleUnban : handleBan}>
                  {isBanned ? t('unban') : t('ban')}
                </button>
              )}
              {canAddChild && (
                <Link to="/dashboard/new-user" className="tree-btn-add">+ {t('addUser')}</Link>
              )}
              {actionMsg.text && <span className={`tree-action-msg ${actionMsg.type}`}>{actionMsg.text}</span>}
            </span>
          )}
        </td>
      </tr>
      {detailsOpen && (
        <tr className="tree-details-row">
          <td colSpan={6} className="tree-details-cell">
            <div className="tree-details-panel">
              <p className="tree-detail-line"><strong>{t('createdUnder')} :</strong> {parent ? `${parent.login} (${parent.role})` : '—'}</p>
              {children.length > 0 && (
                <p className="tree-detail-line"><strong>{t('accountsCreated')} :</strong> {children.map((c) => c.login).join(', ')}</p>
              )}
            </div>
          </td>
        </tr>
      )}
      {showExpand && isExpanded && childrenToShow.map((c) => (
        <TreeTableRow
          key={c.id}
          node={c}
          users={users}
          level={level + 1}
          canSeeUserBalance={canSeeUserBalance}
          viewerRole={viewerRole}
          expandedIds={expandedIds}
          onToggle={onToggle}
          visibleIds={visibleIds}
          displayCurrency={displayCurrency}
          detailsOpenId={detailsOpenId}
          onDetailsToggle={onDetailsToggle}
          currentUser={currentUser}
          transfer={transfer}
          withdraw={withdraw}
          canTransferTo={canTransferTo}
          canWithdrawFrom={canWithdrawFrom}
          setUserStatus={setUserStatus}
          canBanUser={canBanUser}
          canCreateRole={canCreateRole}
          ROLES={ROLES}
          t={t}
        />
      ))}
    </>
  );
}

export default function Tree() {
  const {
    user,
    users,
    canSeeUserBalance,
    getVisibleUsers,
    transfer,
    withdraw,
    canTransferTo,
    canWithdrawFrom,
    setUserStatus,
    canBanUser,
    canCreateRole,
    ROLES,
  } = useAuth();
  const { displayCurrency, t } = useLanguage();
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [detailsOpenId, setDetailsOpenId] = useState(null);

  const visibleUsers = useMemo(() => getVisibleUsers(user, users), [user, users, getVisibleUsers]);

  const visibleIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const matching = visibleUsers.filter((u) => (u.login || '').toLowerCase().includes(q));
    const idSet = new Set();
    matching.forEach((u) => {
      idSet.add(u.id);
      getAncestorIds(u.id, visibleUsers).forEach((id) => idSet.add(id));
    });
    return idSet;
  }, [search, visibleUsers]);

  useEffect(() => {
    if (!visibleIds || visibleIds.size === 0) return;
    const toExpand = new Set();
    visibleUsers.forEach((u) => {
      if (visibleIds.has(u.id)) getAncestorIds(u.id, visibleUsers).forEach((id) => toExpand.add(id));
    });
    setExpandedIds((prev) => {
      const next = new Set(prev);
      toExpand.forEach((id) => next.add(id));
      return next;
    });
  }, [visibleIds, visibleUsers]);

  const roots =
    user?.role === ROLES.MASTER
      ? visibleUsers.filter((u) => !u.parentId)
      : user
        ? [user]
        : [];

  const rootsToShow = useMemo(() => {
    if (!visibleIds) return roots;
    return roots.filter((r) => visibleIds.has(r.id));
  }, [roots, visibleIds]);

  const handleToggle = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDetailsToggle = (id) => {
    setDetailsOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={`dashboard-page tree-page${filtersOpen ? ' filters-open' : ''}`}>
      <h1>{t('tree')}</h1>
      <p className="page-desc">
        Hiérarchie des comptes. Cliquez sur + pour développer, sur ▶ pour les détails (créditer, retirer, bannir).
      </p>

      <button
        type="button"
        className="tree-show-filters-btn"
        onClick={() => setFiltersOpen((o) => !o)}
        aria-expanded={filtersOpen}
      >
        {filtersOpen ? t('hideFilters') : t('showFilters')}
      </button>
      <div className="tree-search-wrap">
        <label className="tree-search-label">
          <span>{t('search')}</span>
          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="tree-search-input"
          />
        </label>
      </div>

      <div className="tree-table-wrap">
        <table className="tree-table">
          <thead>
            <tr>
              <th>{t('subUsers')}</th>
              <th>{t('parents')}</th>
              <th>{t('level')}</th>
              <th>{t('id')}</th>
              <th>{t('balance')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rootsToShow.length === 0 ? (
              <tr>
                <td colSpan={6} className="tree-no-result-cell">Aucun compte ne correspond à la recherche.</td>
              </tr>
            ) : (
              rootsToShow.map((u) => (
                <TreeTableRow
                  key={u.id}
                  node={u}
                  users={visibleUsers}
                  level={0}
                  canSeeUserBalance={canSeeUserBalance}
                  viewerRole={user?.role}
                  expandedIds={expandedIds}
                  onToggle={handleToggle}
                  visibleIds={visibleIds}
                  displayCurrency={displayCurrency}
                  detailsOpenId={detailsOpenId}
                  onDetailsToggle={handleDetailsToggle}
                  currentUser={user}
                  transfer={transfer}
                  withdraw={withdraw}
                  canTransferTo={canTransferTo}
                  canWithdrawFrom={canWithdrawFrom}
                  setUserStatus={setUserStatus}
                  canBanUser={canBanUser}
                  canCreateRole={canCreateRole}
                  ROLES={ROLES}
                  t={t}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

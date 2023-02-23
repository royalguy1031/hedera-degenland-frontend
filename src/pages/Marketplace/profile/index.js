import React, { useState, useEffect } from 'react';
import { useHistory } from "react-router-dom";

import { styled, useTheme } from '@mui/material/styles';

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
    Avatar,
    Backdrop,
    Button,
    LinearProgress,
    CircularProgress,
    Box,
    Tab,
    Pagination
} from '@mui/material';

import {
    TabList,
    TabContext,
    TabPanel
} from '@mui/lab';

import { useHashConnect } from "../../../assets/api/HashConnectAPIProvider.tsx";
import { getRequest, postRequest } from "../../../assets/api/apiRequests";
import * as env from "../../../env";

import NavBar from '../../../components/NavBar';
import NFTCard from "../../../components/NFTCard";

const pagenationDisplayCount = 24;

export default function Profile() {
    const { walletData } = useHashConnect();
    const { accountIds } = walletData;

    let history = useHistory();
    const [loadingView, setLoadingView] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [walletNftInfo, setWalletNftInfo] = useState(null);
    const [listingNftInfo, setListingNftInfo] = useState(null);

    const [nftPageIndex, setNftPageIndex] = useState(1);
    const [currentPageNftList, setCurrentPageNftList] = useState([]);

    const [tabValue, setTabValue] = useState('Owned');

    useEffect(() => {
        if (accountIds?.length > 0) {
            getProfileData(accountIds[0]);
            getWalletMyNftData(accountIds[0]);
        }
    }, [accountIds]);

    useEffect(() => {
        if (walletNftInfo)
            resetNftListToDisplay(1, walletNftInfo);
    }, [walletNftInfo]);

    const resetNftListToDisplay = (pageIndex_, nftList_) => {
        let _startIndex = (pageIndex_ - 1) * pagenationDisplayCount;
        let _endIndex = pageIndex_ * pagenationDisplayCount > nftList_.length ? nftList_.length : pageIndex_ * pagenationDisplayCount;
        setCurrentPageNftList(nftList_.slice(_startIndex, _endIndex));
    }

    // load profile data
    const getProfileData = async (accountId) => {
        setLoadingView(true);
        const _res = await getRequest(env.SERVER_URL + "/api/account/get_player?accountId=" + accountId);
        if (!_res) {
            toast.error("Something wrong with server!");
            setLoadingView(false);
            return;
        }
        if (!_res.result) {
            toast.error(_res.error);
            setLoadingView(false);
            return;
        }
        setProfileData(_res.data);
    }

    // load nfts info
    const getWalletMyNftData = async (accountId_) => {
        let _nextLink = null;
        let _newWalletNftInfo = [];

        let _WNinfo = await getRequest(env.MIRROR_NET_URL + "/api/v1/accounts/" + accountId_ + "/nfts");
        if (!_WNinfo) {
            toast.error("Something wrong with network!");
            setLoadingView(false);
            return;
        }

        if (_WNinfo && _WNinfo.nfts.length > 0)
            _nextLink = _WNinfo.links.next;

        while (1) {
            let _tempNftInfo = _WNinfo.nfts;

            for (let i = 0; i < _tempNftInfo.length; i++) {
                let _nftInfoResponse = await getNftInfoFromMirrorNet(_tempNftInfo[i].token_id, _tempNftInfo[i].serial_number);

                if (_nftInfoResponse.result) {
                    _newWalletNftInfo.push({
                        token_id: _tempNftInfo[i].token_id,
                        serial_number: _tempNftInfo[i].serial_number,
                        imageUrl: _nftInfoResponse.metaData.imageUrl,
                        name: _nftInfoResponse.metaData.name,
                        creator: _nftInfoResponse.metaData.creator,
                    })
                }
            }
            if (!_nextLink || _nextLink === null) break;

            _WNinfo = await getRequest(env.MIRROR_NET_URL + _nextLink);
            _nextLink = null;
            if (_WNinfo && _WNinfo.nfts.length > 0)
                _nextLink = _WNinfo.links.next;
        }
        setWalletNftInfo(_newWalletNftInfo);
        setLoadingView(false);
    }

    const getNftInfoFromMirrorNet = async (tokenId_, serialNum_) => {
        const g_singleNftInfo = await getRequest(`${env.MIRROR_NET_URL}/api/v1/tokens/${tokenId_}/nfts?serialNumber=${serialNum_}`);
        if (g_singleNftInfo && g_singleNftInfo.nfts.length > 0) {
            let g_preMdUrl = base64ToUtf8(g_singleNftInfo.nfts[0].metadata).split("//");

            let _metadataUrl = env.IPFS_URL + g_preMdUrl[g_preMdUrl.length - 1];
            const _metadataInfo = await getRequest(_metadataUrl); // get NFT metadata
            if (_metadataInfo && _metadataInfo.image != undefined) {
                let _imageUrlList = _metadataInfo.image.split('/');
                let _imageUrlLen = _imageUrlList?.length;
                const _imageUrl = env.IPFS_URL + _imageUrlList[_imageUrlLen - 2] + "/" + _imageUrlList[_imageUrlLen - 1];

                const _metaData = {
                    creator: _metadataInfo.creator,
                    name: _metadataInfo.name,
                    imageUrl: _imageUrl
                };
                return { result: true, metaData: _metaData };
            }
            return { result: false };
        }
        return { result: false };
    }

    const getNftListing = async () => {
        setLoadingView(true);
        const _res = await getRequest(env.SERVER_URL + "/api/marketplace/get_player?accountId=" + accountId);
        if (!_res) {
            toast.error("Something wrong with server!");
            setLoadingView(false);
            return;
        }
        if (!_res.result) {
            toast.error(_res.error);
            setLoadingView(false);
            return;
        }
        setProfileData(_res.data);
    }

    // convert metadata base64 string to utf8
    const base64ToUtf8 = (base64Str_) => {
        // create a buffer
        const _buff = Buffer.from(base64Str_, 'base64');

        // decode buffer as UTF-8
        const _utf8Str = _buff.toString('utf-8');

        return _utf8Str;
    }

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        getNftListing();
    };

    const DrawerHeader = styled('div')(({ theme }) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: theme.spacing(0, 1),
        // necessary for content to be below app bar
        ...theme.mixins.toolbar,
    }));

    return (
        <Box sx={{
            display: 'flex',
            height: 'fit-content',
            minHeight: '100vh',
        }}>
            <NavBar />
            <Box component="main" sx={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                p: 3,
                backgroundColor: '#ffc0ff',
                marginLeft: '5rem'
            }}>
                {/* account info */}
                {
                    profileData &&
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '100px',
                        marginBottom: '10px',
                        position: 'relative'
                    }}>
                        <Avatar alt={profileData.accountId} src={env.SERVER_URL + profileData.avatarUrl}
                            sx={{
                                width: 128,
                                height: 128,
                                fontSize: '64px',
                                backgroundColor: '#e0e0e0',
                                border: '2px solid white'
                            }}
                        />
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            marginLeft: '20px'
                        }}>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}>
                                <p style={{
                                    width: 180,
                                    margin: '0',
                                    fontSize: '24px',
                                    fontWeight: '700',
                                    color: '#873135',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {profileData.playerId}
                                </p>
                                <Button
                                    sx={{
                                        height: '25px',
                                        borderRadius: '21px',
                                        textTransform: 'none',
                                        fontSize: 16,
                                        fontWeight: 700,
                                        color: 'white',
                                        padding: '0 25px',
                                        backgroundColor: '#e74895',
                                        marginRight: '5px',
                                        '&:hover': {
                                            backgroundColor: 'grey',
                                            boxShadow: 'none',
                                        },
                                        '&:focus': {
                                            outline: 'none',
                                            boxShadow: 'none',
                                        }
                                    }}>
                                    Edit
                                </Button>
                            </div>
                            <LinearProgress variant='determinate' value={(profileData.currentLevelScore / profileData.targetLevelScore) * 100} />
                            <p style={{
                                margin: '0',
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#1976d2',
                                marginBottom: '5px'
                            }}>
                                Level : {profileData.level}
                            </p>
                        </div>
                    </div>
                }
                <Box sx={{ width: '100%', typography: 'body1' }}>
                    <TabContext value={tabValue}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <TabList onChange={handleTabChange} aria-label="lab API tabs example">
                                <Tab label="Owned" value="Owned" />
                                <Tab label="Listings" value="Listings" />
                                <Tab label="Collections" value="Collections" />
                            </TabList>
                        </Box>
                        <TabPanel value="Owned">
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <Box>
                                    {
                                        currentPageNftList?.length == 0 &&
                                        <p style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: '#8b1832',
                                            margin: '5px 25px 25px 25px',
                                            textTransform: 'none',
                                            textAlign: 'center',
                                        }}>
                                            No NFT
                                        </p>
                                    }
                                    {
                                        currentPageNftList?.length > 0 &&
                                        currentPageNftList.map((item, index) => {
                                            return <Box key={index}
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    float: 'left',
                                                    width: '250px',
                                                    padding: '5px',
                                                    margin: '5px'
                                                }}>
                                                <NFTCard nftInfo={item}
                                                    onClickNFTCard={() => {
                                                        history.push(`/profile/${item.token_id}/${item.serial_number}`);
                                                    }}
                                                />
                                            </Box>
                                        })
                                    }
                                </Box>
                                <Box>
                                    {
                                        walletNftInfo &&
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'right',
                                            paddingTop: '10px',
                                            paddingRight: '10px',
                                        }}>
                                            <Pagination
                                                sx={{
                                                    '& li': {
                                                        padding: '0',
                                                        '& button': {
                                                            '&:focus': {
                                                                outline: 'none',
                                                            },
                                                        },
                                                    },
                                                }}
                                                page={nftPageIndex}
                                                onChange={(event, value) => {
                                                    resetNftListToDisplay(value, walletNftInfo);
                                                    setNftPageIndex(value);
                                                }}
                                                count={parseInt(walletNftInfo.length / pagenationDisplayCount) + (walletNftInfo.length % pagenationDisplayCount !== 0 ? 1 : 0)}
                                                variant="outlined" />
                                        </div>
                                    }
                                </Box>
                            </Box>
                        </TabPanel>
                        <TabPanel value="Listings">Item Two</TabPanel>
                        <TabPanel value="Collections">Item Three</TabPanel>
                    </TabContext>
                </Box>
            </Box>
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={loadingView}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
        </Box>
    );
}
